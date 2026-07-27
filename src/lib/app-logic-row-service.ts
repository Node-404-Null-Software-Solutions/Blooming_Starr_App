import type { BusinessContext } from "@/lib/business-context";
import {
  APP_LOGIC_MODULE_TRIGGERS,
  type AppLogicTrigger,
  type ExecutableAppLogicModule,
} from "@/lib/app-logic-contract";
import {
  loadAppLogicRunner,
  loadDetailedAppLogicRunner,
} from "@/lib/app-logic-engine";
import type { AppLogicRunnerResult } from "@/lib/app-logic-engine";
import { executeGovernedAppLogicActions } from "@/lib/app-logic-action-broker";
import {
  persistAppLogicExecutionAudit,
  type AppLogicExecutionSource,
} from "@/lib/app-logic-audit";
import { AppLogicExecutionFailure } from "@/lib/app-logic-engine";
import {
  dateFieldsFromAppLogicScope,
  dateFieldsToAppLogicScope,
  scheduleFromAppLogicScope,
  scheduleToAppLogicScope,
} from "@/lib/app-logic-row-mapping";
import { createFertilizerLogRepository } from "@/lib/repositories/fertilizer-log";
import { createOverheadExpenseRepository } from "@/lib/repositories/overhead-expense";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";
import { createSalesRepository } from "@/lib/repositories/sales";
import { createScheduleEntryRepository } from "@/lib/repositories/schedule-entry";
import { createTreatmentTrackingRepository } from "@/lib/repositories/treatment-tracking";

export type AppLogicRowLifecycle = "IMPORT" | "INTERACTIVE";
export type AppLogicNumericScope = Record<string, number>;

type RunnerLoader = typeof loadAppLogicRunner;
type DetailedRunnerLoader = typeof loadDetailedAppLogicRunner;

function lifecycleTriggers(
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle
): AppLogicTrigger[] {
  const requested: AppLogicTrigger[] =
    lifecycle === "IMPORT"
      ? ["beforeSave", "afterImport"]
      : ["beforeSave", "afterSave"];
  const supported = APP_LOGIC_MODULE_TRIGGERS[module] as readonly AppLogicTrigger[];
  return requested.filter((trigger) => supported.includes(trigger));
}

export async function loadAppLogicRowPipeline(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle,
  loadRunner: RunnerLoader = loadAppLogicRunner
) {
  const triggers = lifecycleTriggers(module, lifecycle);
  const runners = await Promise.all(
    triggers.map((trigger) => loadRunner(context, module, trigger))
  );

  return (input: AppLogicNumericScope): AppLogicNumericScope =>
    runners.reduce((scope, run) => run(scope), { ...input });
}

export async function runAppLogicRowPipeline(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle,
  input: AppLogicNumericScope
): Promise<AppLogicNumericScope> {
  const result = await runDetailedAppLogicRowPipeline(
    context,
    module,
    lifecycle,
    input
  );
  return result.scope;
}

export async function loadDetailedAppLogicRowPipeline(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle,
  loadRunner: DetailedRunnerLoader = loadDetailedAppLogicRunner
) {
  const triggers = lifecycleTriggers(module, lifecycle);
  const runners = await Promise.all(
    triggers.map((trigger) => loadRunner(context, module, trigger))
  );

  return (input: AppLogicNumericScope): AppLogicRunnerResult =>
    runners.reduce<AppLogicRunnerResult>(
      (result, run) => {
        const next = run(result.scope);
        return {
          scope: next.scope,
          actions: [...result.actions, ...next.actions],
          executions: [...result.executions, ...next.executions],
        };
      },
      { scope: { ...input }, actions: [], executions: [] }
    );
}

export async function runDetailedAppLogicRowPipeline(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle,
  input: AppLogicNumericScope,
  audit: {
    source?: AppLogicExecutionSource;
    sourceRowId?: string;
  } = {}
): Promise<AppLogicRunnerResult> {
  const run = await loadDetailedAppLogicRowPipeline(
    context,
    module,
    lifecycle
  );
  const source =
    audit.source ?? (lifecycle === "IMPORT" ? "AFTER_IMPORT" : "INTERACTIVE");
  try {
    const result = run(input);
    await persistAppLogicExecutionAudit(
      context,
      result.executions,
      source,
      audit.sourceRowId
    );
    return result;
  } catch (error) {
    if (error instanceof AppLogicExecutionFailure) {
      await persistAppLogicExecutionAudit(
        context,
        error.executions,
        source,
        audit.sourceRowId
      );
    }
    throw error;
  }
}

export async function loadAuditedDetailedAppLogicRowPipeline(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  lifecycle: AppLogicRowLifecycle,
  source: AppLogicExecutionSource =
    lifecycle === "IMPORT" ? "AFTER_IMPORT" : "INTERACTIVE"
) {
  const runDetailed = await loadDetailedAppLogicRowPipeline(
    context,
    module,
    lifecycle
  );
  const pending: Array<{
    executions: AppLogicRunnerResult["executions"];
    sourceRowId?: string;
  }> = [];

  return Object.freeze({
    run(input: AppLogicNumericScope, sourceRowId?: string) {
      try {
        const result = runDetailed(input);
        pending.push({ executions: result.executions, sourceRowId });
        return result;
      } catch (error) {
        if (error instanceof AppLogicExecutionFailure) {
          pending.push({ executions: error.executions, sourceRowId });
        }
        throw error;
      }
    },
    async flush() {
      const batches = pending.splice(0, pending.length);
      for (const batch of batches) {
        await persistAppLogicExecutionAudit(
          context,
          batch.executions,
          source,
          batch.sourceRowId
        );
      }
    },
  });
}

export async function runManualAppLogicForRow(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  rowId: string
): Promise<{ found: boolean; scope?: AppLogicNumericScope }> {
  const supported = APP_LOGIC_MODULE_TRIGGERS[module] as readonly AppLogicTrigger[];
  if (!supported.includes("manual")) {
    throw new Error(`Manual app logic is not connected for ${module}.`);
  }

  const run = await loadDetailedAppLogicRunner(context, module, "manual");
  const runAudited = async (input: AppLogicNumericScope) => {
    try {
      const result = run(input);
      await persistAppLogicExecutionAudit(
        context,
        result.executions,
        "MANUAL",
        rowId
      );
      return result;
    } catch (error) {
      if (error instanceof AppLogicExecutionFailure) {
        await persistAppLogicExecutionAudit(
          context,
          error.executions,
          "MANUAL",
          rowId
        );
      }
      throw error;
    }
  };
  if (module === "sales") {
    const rows = createSalesRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited({
      qty: row.qty,
      salePriceCents: row.salePriceCents,
      costCents: row.costCents,
      totalSaleCents: row.totalSaleCents,
      profitCents: row.profitCents,
      marginPct: row.marginPct ?? 0,
    });
    const scope = execution.scope;
    await rows.updateById(rowId, {
      qty: Math.round(scope.qty),
      totalSaleCents: Math.round(scope.totalSaleCents),
      profitCents: Math.round(scope.profitCents),
      marginPct: scope.marginPct,
    });
    await executeGovernedAppLogicActions(
      context,
      {
        module,
        rowId,
        sku: row.sku,
        productName: row.itemName,
        defaultCostCents: row.costCents,
        defaultSalePriceCents: row.salePriceCents,
      },
      execution.actions
    );
    return { found: true, scope };
  }

  if (module === "productIntake") {
    const rows = createProductIntakeRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited({
      totalCostCents: row.totalCostCents,
      qty: row.qty,
      unitCostCents: row.unitCostCents,
    });
    const scope = execution.scope;
    await rows.updateById(rowId, {
      unitCostCents: Math.round(scope.unitCostCents),
    });
    await executeGovernedAppLogicActions(
      context,
      {
        module,
        rowId,
        sku: row.sku,
        productName: row.category,
        defaultCostCents: Math.round(scope.unitCostCents),
      },
      execution.actions
    );
    return { found: true, scope };
  }

  if (module === "overheadExpenses") {
    const rows = createOverheadExpenseRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited({
      subTotalCents: row.subTotalCents,
      shippingCents: row.shippingCents,
      discountCents: row.discountCents,
      qty: row.qty,
      unitCostCents: row.unitCostCents,
      totalCents: row.totalCents,
    });
    const scope = execution.scope;
    await rows.updateById(rowId, {
      unitCostCents: Math.round(scope.unitCostCents),
      totalCents: Math.round(scope.totalCents),
    });
    return { found: true, scope };
  }

  if (module === "plantIntake") {
    const rows = createPlantIntakeRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited({
      qty: row.qty,
      costCents: row.costCents,
      msrpCents: row.msrpCents,
    });
    const scope = execution.scope;
    await rows.updateById(rowId, {
      qty: Math.round(scope.qty),
      costCents: Math.round(scope.costCents),
      msrpCents: Math.round(scope.msrpCents),
    });
    await executeGovernedAppLogicActions(
      context,
      {
        module,
        rowId,
        sku: row.sku,
        productName: [row.genus, row.cultivar].filter(Boolean).join(" "),
        defaultCostCents: Math.round(scope.costCents),
        defaultSalePriceCents: Math.round(scope.msrpCents),
      },
      execution.actions
    );
    return { found: true, scope };
  }

  if (module === "treatmentTracking") {
    const rows = createTreatmentTrackingRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited(
      dateFieldsToAppLogicScope({
        date: row.date,
        nextEarliest: row.nextEarliest,
        nextLatest: row.nextLatest,
      })
    );
    const scope = execution.scope;
    await rows.updateById(rowId, dateFieldsFromAppLogicScope(scope));
    return { found: true, scope };
  }

  if (module === "fertilizerLog") {
    const rows = createFertilizerLogRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited(
      dateFieldsToAppLogicScope({
        date: row.date,
        nextEarliest: row.nextEarliest,
        nextLatest: row.nextLatest,
      })
    );
    const scope = execution.scope;
    await rows.updateById(rowId, dateFieldsFromAppLogicScope(scope));
    return { found: true, scope };
  }

  if (module === "schedule") {
    const rows = createScheduleEntryRepository(context);
    const row = await rows.findById(rowId);
    if (!row) return { found: false };
    const execution = await runAudited(
      scheduleToAppLogicScope({
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
      })
    );
    const scope = execution.scope;
    await rows.updateById(rowId, scheduleFromAppLogicScope(scope));
    return { found: true, scope };
  }

  throw new Error(`Manual app logic is not connected for ${module}.`);
}
