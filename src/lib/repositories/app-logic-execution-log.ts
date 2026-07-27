import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import { withBusinessData } from "@/lib/repositories/tenant-scope";

type AppLogicExecutionLogRepositoryClient = {
  appLogicExecutionLog: PrismaClient["appLogicExecutionLog"];
};

export type TenantAppLogicExecutionLogCreateInput = Omit<
  Prisma.AppLogicExecutionLogCreateManyInput,
  "businessId"
>;

export function createAppLogicExecutionLogRepository(
  context: BusinessContext,
  client: AppLogicExecutionLogRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    createMany(data: TenantAppLogicExecutionLogCreateInput[]) {
      if (data.length === 0) return Promise.resolve({ count: 0 });
      return client.appLogicExecutionLog.createMany({
        data: data.map((entry) => withBusinessData(businessId, entry)),
      });
    },

    listRecent(limit = 50) {
      const take = Math.max(1, Math.min(200, Math.floor(limit)));
      return client.appLogicExecutionLog.findMany({
        where: { businessId },
        select: {
          id: true,
          ruleId: true,
          ruleName: true,
          module: true,
          trigger: true,
          mode: true,
          source: true,
          sourceRowId: true,
          status: true,
          durationMs: true,
          statementCount: true,
          actionCount: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take,
      });
    },
  });
}
