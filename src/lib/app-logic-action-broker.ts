import type { BusinessContext } from "@/lib/business-context";
import {
  APP_LOGIC_MODULE_ACTIONS,
  type ExecutableAppLogicModule,
} from "@/lib/app-logic-contract";
import type { GovernedAppLogicActionIntent } from "@/lib/app-logic-engine";
import { createProductRepository } from "@/lib/repositories/product";
import type { TenantScopedClient } from "@/lib/tenant-rls";
import { persistAppLogicExecutionAudit } from "@/lib/app-logic-audit";

type ProductSyncSource = {
  module: "sales" | "productIntake";
  rowId: string;
  sku: string;
  productName: string | null;
  defaultCostCents: number;
  defaultSalePriceCents?: number;
};

export type AppLogicActionSource = ProductSyncSource;

export type AppLogicActionResult = {
  action: GovernedAppLogicActionIntent["action"];
  ruleId: string;
  target: "Product";
  targetKey: string;
};

function assertActionAllowed(
  sourceModule: ExecutableAppLogicModule,
  intent: GovernedAppLogicActionIntent
) {
  if (intent.module !== sourceModule) {
    throw new Error(
      `Rule ${intent.ruleId} cannot execute for a different source module.`
    );
  }
  const allowed = APP_LOGIC_MODULE_ACTIONS[sourceModule] as readonly string[];
  if (!allowed.includes(intent.action)) {
    throw new Error(
      `${intent.action} is not governed for ${sourceModule}.`
    );
  }
}

export async function executeGovernedAppLogicActions(
  context: BusinessContext,
  source: AppLogicActionSource,
  intents: readonly GovernedAppLogicActionIntent[],
  client?: TenantScopedClient
): Promise<AppLogicActionResult[]> {
  if (intents.length === 0) return [];
  const products = createProductRepository(context, client);
  const results: AppLogicActionResult[] = [];

  for (const intent of intents) {
    assertActionAllowed(source.module, intent);
    if (intent.action !== "SYNC_PRODUCT_MASTER") {
      throw new Error(`Unknown governed action ${intent.action}.`);
    }
    if (!source.sku.trim()) {
      throw new Error("SYNC_PRODUCT_MASTER requires a source SKU.");
    }

    const startedAt = Date.now();
    try {
      await products.upsertBySku(
        source.sku,
        {
          productName: source.productName,
          defaultCostCents: source.defaultCostCents,
          defaultSalePriceCents: source.defaultSalePriceCents ?? 0,
        },
        {
          productName: source.productName,
          defaultCostCents: source.defaultCostCents,
          ...(source.defaultSalePriceCents !== undefined && {
            defaultSalePriceCents: source.defaultSalePriceCents,
          }),
        }
      );
    } catch (error) {
      await persistAppLogicExecutionAudit(
        context,
        [
          {
            ruleId: intent.ruleId,
            ruleName: intent.ruleName,
            module: intent.module,
            trigger: intent.trigger,
            mode: "SCRIPT",
            status: "FAILED",
            durationMs: Math.max(0, Date.now() - startedAt),
            statementCount: 1,
            actionCount: 1,
            errorCode: "ACTION",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Governed action failed.",
          },
        ],
        intent.trigger === "manual" ? "MANUAL" : "INTERACTIVE",
        source.rowId
      );
      throw new Error(
        `Governed action ${intent.action} failed for rule "${intent.ruleName}".`
      );
    }
    results.push({
      action: intent.action,
      ruleId: intent.ruleId,
      target: "Product",
      targetKey: source.sku,
    });
  }

  return results;
}
