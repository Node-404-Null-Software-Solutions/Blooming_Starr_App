import type { Prisma } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";

export const TENANT_DATABASE_ROLE = "blooming_starr_tenant";

export const TENANT_DATA_DELEGATES = Object.freeze([
  "appLogicExecutionLog",
  "appLogicRule",
  "employee",
  "fertilizerLog",
  "lookupEntry",
  "overheadExpense",
  "plantIntake",
  "plantSkuReference",
  "pricingEntry",
  "product",
  "productIntake",
  "salesEntry",
  "scheduleEntry",
  "transplantLog",
  "treatmentTracking",
] as const);

const tenantScopedClientBrand = Symbol("TenantScopedClient");
const setLocalRoleSql = `SET LOCAL ROLE "${TENANT_DATABASE_ROLE}"`;
const setBusinessContextSql =
  "SELECT set_config('app.business_id', $1, true)";

export type TenantScopedClient = Prisma.TransactionClient & {
  readonly [tenantScopedClientBrand]: true;
};

type TransactionRunner = {
  $transaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>
  ): Promise<T>;
};

async function activateTenantScope(
  transaction: Prisma.TransactionClient,
  context: BusinessContext
) {
  await transaction.$executeRawUnsafe(setLocalRoleSql);
  await transaction.$queryRawUnsafe(
    setBusinessContextSql,
    context.businessId
  );
}

export function createTenantRlsRuntime(rootClient: TransactionRunner) {
  async function withTenantRlsTransaction<T>(
    context: BusinessContext,
    operation: (transaction: TenantScopedClient) => Promise<T>
  ): Promise<T> {
    return rootClient.$transaction(async (transaction) => {
      await activateTenantScope(transaction, context);
      return operation(transaction as TenantScopedClient);
    });
  }

  function createTenantScopedClient(
    context: BusinessContext
  ): TenantScopedClient {
    const delegateNames = new Set<string>(TENANT_DATA_DELEGATES);
    const delegateCache = new Map<string, object>();

    return new Proxy(Object.create(null) as TenantScopedClient, {
      get(_target, property) {
        if (property === tenantScopedClientBrand) return true;
        if (typeof property !== "string" || !delegateNames.has(property)) {
          throw new Error(
            `Tenant-scoped database access does not expose ${String(property)}`
          );
        }

        const cached = delegateCache.get(property);
        if (cached) return cached;

        const delegate = new Proxy(Object.create(null) as object, {
          get(_delegateTarget, operation) {
            if (typeof operation !== "string") return undefined;
            return (...args: unknown[]) =>
              withTenantRlsTransaction(context, async (transaction) => {
                const transactionDelegate = (
                  transaction as unknown as Record<
                    string,
                    Record<string, (...values: unknown[]) => unknown>
                  >
                )[property];
                const delegateOperation = transactionDelegate?.[operation];
                if (typeof delegateOperation !== "function") {
                  throw new Error(
                    `Unknown tenant database operation ${property}.${operation}`
                  );
                }
                return Reflect.apply(delegateOperation, transactionDelegate, args);
              });
          },
        });
        delegateCache.set(property, delegate);
        return delegate;
      },
    });
  }

  return Object.freeze({
    createTenantScopedClient,
    withTenantRlsTransaction,
  });
}
