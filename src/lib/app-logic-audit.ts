import type { BusinessContext } from "@/lib/business-context";
import type { AppLogicExecutionAudit } from "@/lib/app-logic-engine";
import { AppLogicExecutionFailure } from "@/lib/app-logic-engine";
import { createAppLogicExecutionLogRepository } from "@/lib/repositories/app-logic-execution-log";

export type AppLogicExecutionSource =
  | "AFTER_IMPORT"
  | "INTERACTIVE"
  | "MANUAL"
  | "PREVIEW";

export function appLogicFailureMessage(error: unknown): string {
  if (error instanceof AppLogicExecutionFailure) {
    return `App logic stopped this operation: ${error.message}`;
  }
  return "App logic could not complete this operation.";
}

function safeMessage(value: string | undefined): string | null {
  if (!value) return null;
  return value.replaceAll(/\s+/g, " ").trim().slice(0, 500) || null;
}

export async function persistAppLogicExecutionAudit(
  context: BusinessContext,
  executions: readonly AppLogicExecutionAudit[],
  source: AppLogicExecutionSource,
  sourceRowId?: string
) {
  if (executions.length === 0) return;
  const logs = createAppLogicExecutionLogRepository(context);
  await logs.createMany(
    executions.map((execution) => ({
      ruleId: execution.ruleId,
      ruleName: execution.ruleName.slice(0, 120),
      module: execution.module,
      trigger: execution.trigger,
      mode: execution.mode,
      source,
      sourceRowId: sourceRowId?.trim() || null,
      requestId: context.requestId,
      actorUserId: context.userId,
      status: execution.status,
      durationMs: execution.durationMs,
      statementCount: execution.statementCount,
      actionCount: execution.actionCount,
      errorCode: execution.errorCode?.slice(0, 40) || null,
      errorMessage: safeMessage(execution.errorMessage),
    }))
  );
}
