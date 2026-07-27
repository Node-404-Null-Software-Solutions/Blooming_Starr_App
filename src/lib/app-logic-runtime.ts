import {
  APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS,
  APP_LOGIC_HELPERS,
  APP_LOGIC_MODULE_ACTIONS,
} from "@/lib/app-logic-contract";
import type {
  AppLogicActionName,
  AppLogicProgram,
  AppLogicStatement,
  ExecutableAppLogicModule,
} from "@/lib/app-logic-contract";

export type AppLogicRuntimeErrorCode =
  | "ARITHMETIC"
  | "INPUT"
  | "LIMIT"
  | "REQUIREMENT"
  | "SYNTAX"
  | "TYPE";

export class AppLogicRuntimeError extends Error {
  readonly code: AppLogicRuntimeErrorCode;

  constructor(code: AppLogicRuntimeErrorCode, message: string) {
    super(message);
    this.name = "AppLogicRuntimeError";
    this.code = code;
  }
}

export const APP_LOGIC_RUNTIME_LIMITS = Object.freeze({
  maxStatements: 100,
  maxTokensPerExpression: 512,
  maxAstNodesPerExpression: 512,
  maxNestingDepth: 32,
});

type Scalar = number | boolean;
type HelperName = (typeof APP_LOGIC_HELPERS)[number];
type UnaryOperator = "+" | "-" | "!";
type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "<"
  | "<="
  | ">"
  | ">="
  | "=="
  | "==="
  | "!="
  | "!=="
  | "&&"
  | "||";

type ExpressionNode =
  | { kind: "number"; value: number }
  | { kind: "field"; name: string }
  | { kind: "unary"; operator: UnaryOperator; operand: ExpressionNode }
  | {
      kind: "binary";
      operator: BinaryOperator;
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | {
      kind: "conditional";
      condition: ExpressionNode;
      whenTrue: ExpressionNode;
      whenFalse: ExpressionNode;
    }
  | { kind: "call"; helper: HelperName; args: ExpressionNode[] };

type CompiledStatement =
  | {
      kind: "set";
      field: string;
      expression: ExpressionNode;
      line: number;
    }
  | {
      kind: "require";
      expression: ExpressionNode;
      line: number;
    }
  | {
      kind: "action";
      action: AppLogicActionName;
      line: number;
    };

export type CompiledAppLogicProgram = {
  module: ExecutableAppLogicModule;
  mode: AppLogicProgram["mode"];
  statements: CompiledStatement[];
};

export type AppLogicActionIntent = {
  action: AppLogicActionName;
  line: number;
};

export type AppLogicProgramExecution = {
  scope: Record<string, number>;
  actions: AppLogicActionIntent[];
};

type TokenKind = "eof" | "identifier" | "number" | "operator" | "punctuation";

type Token = {
  kind: TokenKind;
  value: string;
  position: number;
  numericValue?: number;
};

const OPERATORS = [
  "!==",
  "===",
  "&&",
  "||",
  "<=",
  ">=",
  "==",
  "!=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "!",
] as const;

function syntaxError(message: string, position?: number): AppLogicRuntimeError {
  const suffix = position === undefined ? "" : ` at character ${position + 1}`;
  return new AppLogicRuntimeError("SYNTAX", `${message}${suffix}.`);
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  const addToken = (token: Token) => {
    tokens.push(token);
    if (tokens.length > APP_LOGIC_RUNTIME_LIMITS.maxTokensPerExpression) {
      throw new AppLogicRuntimeError(
        "LIMIT",
        `Expression exceeds ${APP_LOGIC_RUNTIME_LIMITS.maxTokensPerExpression} tokens.`
      );
    }
  };

  while (position < expression.length) {
    const character = expression[position];
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if (/\d/.test(character) || (character === "." && /\d/.test(expression[position + 1] ?? ""))) {
      const start = position;
      let sawDecimal = false;
      while (position < expression.length) {
        const current = expression[position];
        if (current === "." && !sawDecimal) {
          sawDecimal = true;
          position += 1;
          continue;
        }
        if (!/\d/.test(current)) break;
        position += 1;
      }
      const value = expression.slice(start, position);
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new AppLogicRuntimeError("ARITHMETIC", `Invalid number: ${value}.`);
      }
      addToken({ kind: "number", value, numericValue, position: start });
      continue;
    }

    if (/[A-Za-z_$]/.test(character)) {
      const start = position;
      position += 1;
      while (
        position < expression.length &&
        /[A-Za-z0-9_$]/.test(expression[position])
      ) {
        position += 1;
      }
      addToken({
        kind: "identifier",
        value: expression.slice(start, position),
        position: start,
      });
      continue;
    }

    const operator = OPERATORS.find((candidate) =>
      expression.startsWith(candidate, position)
    );
    if (operator) {
      addToken({ kind: "operator", value: operator, position });
      position += operator.length;
      continue;
    }

    if ("(),?:".includes(character)) {
      addToken({ kind: "punctuation", value: character, position });
      position += 1;
      continue;
    }

    throw syntaxError(`Unexpected character "${character}"`, position);
  }

  tokens.push({ kind: "eof", value: "", position: expression.length });
  return tokens;
}

class ExpressionParser {
  private readonly tokens: Token[];
  private readonly allowedFields: ReadonlySet<string>;
  private tokenIndex = 0;
  private nodeCount = 0;
  private nestingDepth = 0;

  constructor(expression: string, allowedFields: ReadonlySet<string>) {
    this.tokens = tokenize(expression);
    this.allowedFields = allowedFields;
  }

  parse(): ExpressionNode {
    const expression = this.parseConditional();
    const trailing = this.current();
    if (trailing.kind !== "eof") {
      throw syntaxError(`Unexpected token "${trailing.value}"`, trailing.position);
    }
    return expression;
  }

  private current(): Token {
    return this.tokens[this.tokenIndex];
  }

  private advance(): Token {
    const token = this.current();
    this.tokenIndex += 1;
    return token;
  }

  private match(kind: TokenKind, value?: string): boolean {
    const token = this.current();
    if (token.kind !== kind || (value !== undefined && token.value !== value)) {
      return false;
    }
    this.advance();
    return true;
  }

  private expect(kind: TokenKind, value?: string): Token {
    const token = this.current();
    if (token.kind !== kind || (value !== undefined && token.value !== value)) {
      const expected = value ?? kind;
      throw syntaxError(`Expected "${expected}"`, token.position);
    }
    return this.advance();
  }

  private node<T extends ExpressionNode>(node: T): T {
    this.nodeCount += 1;
    if (this.nodeCount > APP_LOGIC_RUNTIME_LIMITS.maxAstNodesPerExpression) {
      throw new AppLogicRuntimeError(
        "LIMIT",
        `Expression exceeds ${APP_LOGIC_RUNTIME_LIMITS.maxAstNodesPerExpression} operations.`
      );
    }
    return node;
  }

  private enterNesting() {
    this.nestingDepth += 1;
    if (this.nestingDepth > APP_LOGIC_RUNTIME_LIMITS.maxNestingDepth) {
      throw new AppLogicRuntimeError(
        "LIMIT",
        `Expression exceeds ${APP_LOGIC_RUNTIME_LIMITS.maxNestingDepth} levels of nesting.`
      );
    }
  }

  private leaveNesting() {
    this.nestingDepth -= 1;
  }

  private parseConditional(): ExpressionNode {
    const condition = this.parseLogicalOr();
    if (!this.match("punctuation", "?")) return condition;

    this.enterNesting();
    try {
      const whenTrue = this.parseConditional();
      this.expect("punctuation", ":");
      const whenFalse = this.parseConditional();
      return this.node({
        kind: "conditional",
        condition,
        whenTrue,
        whenFalse,
      });
    } finally {
      this.leaveNesting();
    }
  }

  private parseLogicalOr(): ExpressionNode {
    let expression = this.parseLogicalAnd();
    while (this.match("operator", "||")) {
      expression = this.node({
        kind: "binary",
        operator: "||",
        left: expression,
        right: this.parseLogicalAnd(),
      });
    }
    return expression;
  }

  private parseLogicalAnd(): ExpressionNode {
    let expression = this.parseEquality();
    while (this.match("operator", "&&")) {
      expression = this.node({
        kind: "binary",
        operator: "&&",
        left: expression,
        right: this.parseEquality(),
      });
    }
    return expression;
  }

  private parseEquality(): ExpressionNode {
    let expression = this.parseComparison();
    while (["==", "===", "!=", "!=="].includes(this.current().value)) {
      const operator = this.advance().value as BinaryOperator;
      expression = this.node({
        kind: "binary",
        operator,
        left: expression,
        right: this.parseComparison(),
      });
    }
    return expression;
  }

  private parseComparison(): ExpressionNode {
    let expression = this.parseAdditive();
    while (["<", "<=", ">", ">="].includes(this.current().value)) {
      const operator = this.advance().value as BinaryOperator;
      expression = this.node({
        kind: "binary",
        operator,
        left: expression,
        right: this.parseAdditive(),
      });
    }
    return expression;
  }

  private parseAdditive(): ExpressionNode {
    let expression = this.parseMultiplicative();
    while (["+", "-"].includes(this.current().value)) {
      const operator = this.advance().value as BinaryOperator;
      expression = this.node({
        kind: "binary",
        operator,
        left: expression,
        right: this.parseMultiplicative(),
      });
    }
    return expression;
  }

  private parseMultiplicative(): ExpressionNode {
    let expression = this.parseUnary();
    while (["*", "/", "%"].includes(this.current().value)) {
      const operator = this.advance().value as BinaryOperator;
      expression = this.node({
        kind: "binary",
        operator,
        left: expression,
        right: this.parseUnary(),
      });
    }
    return expression;
  }

  private parseUnary(): ExpressionNode {
    if (["+", "-", "!"].includes(this.current().value)) {
      const operator = this.advance().value as UnaryOperator;
      return this.node({
        kind: "unary",
        operator,
        operand: this.parseUnary(),
      });
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.current();
    if (token.kind === "number") {
      this.advance();
      return this.node({ kind: "number", value: token.numericValue ?? 0 });
    }

    if (token.kind === "identifier") {
      this.advance();
      if (this.match("punctuation", "(")) {
        if (!APP_LOGIC_HELPERS.includes(token.value as HelperName)) {
          throw syntaxError(`Unknown helper "${token.value}"`, token.position);
        }
        this.enterNesting();
        try {
          const args: ExpressionNode[] = [];
          if (!this.match("punctuation", ")")) {
            do {
              args.push(this.parseConditional());
            } while (this.match("punctuation", ","));
            this.expect("punctuation", ")");
          }
          return this.node({
            kind: "call",
            helper: token.value as HelperName,
            args,
          });
        } finally {
          this.leaveNesting();
        }
      }

      if (!this.allowedFields.has(token.value)) {
        throw syntaxError(`Unknown field "${token.value}"`, token.position);
      }
      return this.node({ kind: "field", name: token.value });
    }

    if (this.match("punctuation", "(")) {
      this.enterNesting();
      try {
        const expression = this.parseConditional();
        this.expect("punctuation", ")");
        return expression;
      } finally {
        this.leaveNesting();
      }
    }

    throw syntaxError("Expected a number, row field, helper, or parenthesized expression", token.position);
  }
}

function asNumber(value: Scalar, context: string): number {
  if (typeof value !== "number") {
    throw new AppLogicRuntimeError("TYPE", `${context} requires a number.`);
  }
  return value;
}

function asBoolean(value: Scalar, context: string): boolean {
  if (typeof value !== "boolean") {
    throw new AppLogicRuntimeError("TYPE", `${context} requires a boolean.`);
  }
  return value;
}

function finiteNumber(value: number, context: string): number {
  if (!Number.isFinite(value)) {
    throw new AppLogicRuntimeError(
      "ARITHMETIC",
      `${context} produced a non-finite number.`
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

const HELPERS: Record<
  HelperName,
  { minArgs: number; maxArgs: number; run: (...args: number[]) => number }
> = {
  abs: { minArgs: 1, maxArgs: 1, run: Math.abs },
  ceil: { minArgs: 1, maxArgs: 1, run: Math.ceil },
  floor: { minArgs: 1, maxArgs: 1, run: Math.floor },
  max: { minArgs: 1, maxArgs: 32, run: Math.max },
  min: { minArgs: 1, maxArgs: 32, run: Math.min },
  round: { minArgs: 1, maxArgs: 1, run: Math.round },
};

function assertHelperArity(helperName: HelperName, argumentCount: number) {
  const helper = HELPERS[helperName];
  if (argumentCount < helper.minArgs || argumentCount > helper.maxArgs) {
    const expected =
      helper.minArgs === helper.maxArgs
        ? `${helper.minArgs}`
        : `${helper.minArgs}-${helper.maxArgs}`;
    throw new AppLogicRuntimeError(
      "TYPE",
      `${helperName} expects ${expected} argument(s).`
    );
  }
}

type ExpressionValueType = "boolean" | "number";

function inferExpressionType(node: ExpressionNode): ExpressionValueType {
  switch (node.kind) {
    case "number":
    case "field":
      return "number";
    case "call":
      assertHelperArity(node.helper, node.args.length);
      for (const argument of node.args) {
        if (inferExpressionType(argument) !== "number") {
          throw new AppLogicRuntimeError(
            "TYPE",
            `${node.helper} arguments must be numbers.`
          );
        }
      }
      return "number";
    case "unary": {
      const operandType = inferExpressionType(node.operand);
      const expectedType = node.operator === "!" ? "boolean" : "number";
      if (operandType !== expectedType) {
        throw new AppLogicRuntimeError(
          "TYPE",
          `Unary ${node.operator} requires a ${expectedType}.`
        );
      }
      return expectedType;
    }
    case "conditional": {
      if (inferExpressionType(node.condition) !== "boolean") {
        throw new AppLogicRuntimeError(
          "TYPE",
          "Conditional expression requires a boolean condition."
        );
      }
      const trueType = inferExpressionType(node.whenTrue);
      const falseType = inferExpressionType(node.whenFalse);
      if (trueType !== falseType) {
        throw new AppLogicRuntimeError(
          "TYPE",
          "Conditional branches must produce the same type."
        );
      }
      return trueType;
    }
    case "binary": {
      const leftType = inferExpressionType(node.left);
      const rightType = inferExpressionType(node.right);
      if (["&&", "||"].includes(node.operator)) {
        if (leftType !== "boolean" || rightType !== "boolean") {
          throw new AppLogicRuntimeError(
            "TYPE",
            `Logical ${node.operator} requires boolean operands.`
          );
        }
        return "boolean";
      }
      if (["==", "===", "!=", "!=="].includes(node.operator)) {
        return "boolean";
      }
      if (leftType !== "number" || rightType !== "number") {
        throw new AppLogicRuntimeError(
          "TYPE",
          `Operator ${node.operator} requires numeric operands.`
        );
      }
      return ["<", "<=", ">", ">="].includes(node.operator)
        ? "boolean"
        : "number";
    }
  }
}

function evaluateExpression(
  node: ExpressionNode,
  scope: Readonly<Record<string, number>>
): Scalar {
  switch (node.kind) {
    case "number":
      return node.value;
    case "field":
      return scope[node.name];
    case "unary": {
      const value = evaluateExpression(node.operand, scope);
      if (node.operator === "!") return !asBoolean(value, "Logical NOT");
      const number = asNumber(value, `Unary ${node.operator}`);
      return finiteNumber(node.operator === "-" ? -number : number, "Unary operation");
    }
    case "conditional": {
      const condition = asBoolean(
        evaluateExpression(node.condition, scope),
        "Conditional expression"
      );
      return evaluateExpression(condition ? node.whenTrue : node.whenFalse, scope);
    }
    case "call": {
      const helper = HELPERS[node.helper];
      assertHelperArity(node.helper, node.args.length);
      const args = node.args.map((arg) =>
        asNumber(evaluateExpression(arg, scope), `${node.helper} argument`)
      );
      return finiteNumber(helper.run(...args), `${node.helper}()`);
    }
    case "binary": {
      if (node.operator === "&&") {
        const left = asBoolean(
          evaluateExpression(node.left, scope),
          "Logical AND"
        );
        return left
          ? asBoolean(evaluateExpression(node.right, scope), "Logical AND")
          : false;
      }
      if (node.operator === "||") {
        const left = asBoolean(
          evaluateExpression(node.left, scope),
          "Logical OR"
        );
        return left
          ? true
          : asBoolean(evaluateExpression(node.right, scope), "Logical OR");
      }

      const left = evaluateExpression(node.left, scope);
      const right = evaluateExpression(node.right, scope);
      if (["==", "==="].includes(node.operator)) return left === right;
      if (["!=", "!=="].includes(node.operator)) return left !== right;

      const leftNumber = asNumber(left, `Operator ${node.operator}`);
      const rightNumber = asNumber(right, `Operator ${node.operator}`);
      switch (node.operator) {
        case "+":
          return finiteNumber(leftNumber + rightNumber, "Addition");
        case "-":
          return finiteNumber(leftNumber - rightNumber, "Subtraction");
        case "*":
          return finiteNumber(leftNumber * rightNumber, "Multiplication");
        case "/":
          if (rightNumber === 0) {
            throw new AppLogicRuntimeError("ARITHMETIC", "Division by zero.");
          }
          return finiteNumber(leftNumber / rightNumber, "Division");
        case "%":
          if (rightNumber === 0) {
            throw new AppLogicRuntimeError("ARITHMETIC", "Modulo by zero.");
          }
          return finiteNumber(leftNumber % rightNumber, "Modulo");
        case "<":
          return leftNumber < rightNumber;
        case "<=":
          return leftNumber <= rightNumber;
        case ">":
          return leftNumber > rightNumber;
        case ">=":
          return leftNumber >= rightNumber;
      }
    }
  }

  throw new AppLogicRuntimeError("SYNTAX", "Unsupported expression node.");
}

function withStatementLine<T>(
  statement: AppLogicStatement,
  operation: () => T
): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof AppLogicRuntimeError) {
      throw new AppLogicRuntimeError(
        error.code,
        `Line ${statement.line}: ${error.message}`
      );
    }
    throw error;
  }
}

export function compileAppLogicProgram(
  program: AppLogicProgram
): CompiledAppLogicProgram {
  if (program.statements.length === 0) {
    throw new AppLogicRuntimeError("SYNTAX", "Program has no statements.");
  }
  if (program.statements.length > APP_LOGIC_RUNTIME_LIMITS.maxStatements) {
    throw new AppLogicRuntimeError(
      "LIMIT",
      `Program exceeds ${APP_LOGIC_RUNTIME_LIMITS.maxStatements} statements.`
    );
  }

  const moduleContract = APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS[program.module];
  const allowedFields = new Set<string>(moduleContract.readableFields);
  const writableFields = new Set<string>(moduleContract.writableFields);
  const statements = program.statements.map((statement): CompiledStatement => {
    if (statement.kind === "action") {
      const allowedActions = APP_LOGIC_MODULE_ACTIONS[program.module] as readonly string[];
      if (program.mode !== "SCRIPT") {
        throw new AppLogicRuntimeError(
          "SYNTAX",
          `Line ${statement.line}: ACTION is only valid in scripts.`
        );
      }
      if (!allowedActions.includes(statement.action)) {
        throw new AppLogicRuntimeError(
          "INPUT",
          `Line ${statement.line}: ${statement.action} is not allowed for ${program.module}.`
        );
      }
      return statement;
    }
    if (statement.kind === "set" && !writableFields.has(statement.field)) {
      throw new AppLogicRuntimeError(
        "INPUT",
        `Line ${statement.line}: ${statement.field} is not a writable output field.`
      );
    }
    if (statement.kind === "require" && program.mode !== "SCRIPT") {
      throw new AppLogicRuntimeError(
        "SYNTAX",
        `Line ${statement.line}: REQUIRE is only valid in scripts.`
      );
    }

    const expression = withStatementLine(statement, () =>
      new ExpressionParser(statement.expression, allowedFields).parse()
    );
    const expressionType = withStatementLine(statement, () =>
      inferExpressionType(expression)
    );
    if (statement.kind === "set" && expressionType !== "number") {
      throw new AppLogicRuntimeError(
        "TYPE",
        `Line ${statement.line}: SET ${statement.field} must produce a number.`
      );
    }
    if (statement.kind === "require" && expressionType !== "boolean") {
      throw new AppLogicRuntimeError(
        "TYPE",
        `Line ${statement.line}: REQUIRE must produce a boolean.`
      );
    }
    return statement.kind === "set"
      ? {
          kind: "set",
          field: statement.field,
          expression,
          line: statement.line,
        }
      : { kind: "require", expression, line: statement.line };
  });

  return { module: program.module, mode: program.mode, statements };
}

export function validateAppLogicProgram(
  program: AppLogicProgram
): { ok: true } | { ok: false; error: string } {
  try {
    compileAppLogicProgram(program);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid app logic program.",
    };
  }
}

export function executeAppLogicProgram(
  program: CompiledAppLogicProgram,
  input: Readonly<Record<string, number>>
): Record<string, number> {
  return executeAppLogicProgramDetailed(program, input).scope;
}

export function executeAppLogicProgramDetailed(
  program: CompiledAppLogicProgram,
  input: Readonly<Record<string, number>>
): AppLogicProgramExecution {
  const moduleContract = APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS[program.module];
  const scope: Record<string, number> = {};
  const actions: AppLogicActionIntent[] = [];
  for (const field of moduleContract.readableFields) {
    const value = input[field] ?? 0;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new AppLogicRuntimeError(
        "INPUT",
        `Input field ${field} must be a finite number.`
      );
    }
    scope[field] = Object.is(value, -0) ? 0 : value;
  }

  for (const statement of program.statements) {
    if (statement.kind === "action") {
      actions.push({ action: statement.action, line: statement.line });
      continue;
    }
    const value = evaluateExpression(statement.expression, scope);
    if (statement.kind === "require") {
      if (!asBoolean(value, `REQUIRE on line ${statement.line}`)) {
        throw new AppLogicRuntimeError(
          "REQUIREMENT",
          `Requirement failed on line ${statement.line}.`
        );
      }
      continue;
    }
    scope[statement.field] = finiteNumber(
      asNumber(value, `SET ${statement.field} on line ${statement.line}`),
      `SET ${statement.field}`
    );
  }

  return { scope, actions };
}
