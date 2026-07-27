import {
  getAppLogicModuleContract,
  validateAppLogicRuleContract,
} from "@/lib/app-logic-contract";
import type {
  AppLogicMode,
  AppLogicTrigger,
  ExecutableAppLogicModule,
} from "@/lib/app-logic-contract";
import {
  AppLogicRuntimeError,
  compileAppLogicProgram,
  executeAppLogicProgramDetailed,
} from "@/lib/app-logic-runtime";

export type AppLogicPreviewRequest = {
  module: ExecutableAppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
  expression: string;
  input: Readonly<Record<string, unknown>>;
};

export type AppLogicPreviewResult =
  | {
      ok: true;
      output: Record<string, number>;
      changedFields: Array<{ field: string; before: number; after: number }>;
      actions: Array<{ action: string; line: number }>;
      statementCount: number;
      actionCount: number;
    }
  | {
      ok: false;
      error: string;
      errorCode: string;
      statementCount: number;
      actionCount: number;
    };

function previewFailure(
  error: string,
  errorCode: string,
  statementCount = 0,
  actionCount = 0
): AppLogicPreviewResult {
  return { ok: false, error, errorCode, statementCount, actionCount };
}

export function previewAppLogicProgram(
  request: AppLogicPreviewRequest
): AppLogicPreviewResult {
  const contract = getAppLogicModuleContract(request.module);
  if (!contract) {
    return previewFailure("This module is not connected to app logic.", "INPUT");
  }

  const validation = validateAppLogicRuleContract({
    module: request.module,
    trigger: request.trigger,
    mode: request.mode,
    expression: request.expression,
    enabled: true,
  });
  if (!validation.ok) {
    return previewFailure(validation.error, "VALIDATION");
  }
  if (!validation.program) {
    return previewFailure("The rule has no executable program.", "VALIDATION");
  }

  const input: Record<string, number> = {};
  for (const field of contract.readableFields) {
    const supplied = request.input[field];
    const value = supplied === undefined ? contract.sampleScope[field] ?? 0 : supplied;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return previewFailure(
        `Input field ${field} must be a finite number.`,
        "INPUT",
        validation.program.statements.length
      );
    }
    input[field] = Object.is(value, -0) ? 0 : value;
  }

  try {
    const compiled = compileAppLogicProgram(validation.program);
    const execution = executeAppLogicProgramDetailed(compiled, input);
    const changedFields = contract.writableFields.flatMap((field) => {
      const before = input[field] ?? 0;
      const after = execution.scope[field] ?? 0;
      return Object.is(before, after) ? [] : [{ field, before, after }];
    });

    return {
      ok: true,
      output: execution.scope,
      changedFields,
      actions: execution.actions,
      statementCount: compiled.statements.length,
      actionCount: execution.actions.length,
    };
  } catch (error) {
    const runtimeError =
      error instanceof AppLogicRuntimeError
        ? error
        : new AppLogicRuntimeError(
            "TYPE",
            error instanceof Error ? error.message : "Preview execution failed."
          );
    return previewFailure(
      runtimeError.message,
      runtimeError.code,
      validation.program.statements.length
    );
  }
}
