import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type AppLogicRuleRepositoryClient = {
  appLogicRule: PrismaClient["appLogicRule"];
};

export type TenantAppLogicRuleCreateInput = Omit<
  Prisma.AppLogicRuleUncheckedCreateInput,
  "businessId"
>;

export type TenantAppLogicRuleCreateManyInput = Omit<
  Prisma.AppLogicRuleCreateManyInput,
  "businessId"
>;

export type TenantAppLogicRuleUpdateInput = Omit<
  Prisma.AppLogicRuleUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantAppLogicRuleWhereInput = Omit<
  Prisma.AppLogicRuleWhereInput,
  "businessId" | "business"
>;

export function createAppLogicRuleRepository(
  context: BusinessContext,
  client: AppLogicRuleRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantAppLogicRuleWhereInput,
      orderBy:
        | Prisma.AppLogicRuleOrderByWithRelationInput
        | Prisma.AppLogicRuleOrderByWithRelationInput[] = [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ]
    ) {
      return client.appLogicRule.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    countAll() {
      return client.appLogicRule.count({ where: { businessId } });
    },

    listForManagement() {
      return client.appLogicRule.findMany({
        where: { businessId },
        select: {
          id: true,
          name: true,
          module: true,
          trigger: true,
          mode: true,
          expression: true,
          notes: true,
          enabled: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    },

    listEnabled(module: string, trigger: string) {
      return client.appLogicRule.findMany({
        where: withBusinessScope(businessId, {
          module,
          trigger,
          enabled: true,
        }),
        select: { id: true, name: true, mode: true, expression: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    },

    create(data: TenantAppLogicRuleCreateInput) {
      return client.appLogicRule.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantAppLogicRuleUpdateInput) {
      const result = await client.appLogicRule.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.appLogicRule.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantAppLogicRuleCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.appLogicRule.createMany({
        data: data.map((rule) => withBusinessData(businessId, rule)),
        skipDuplicates: options.skipDuplicates,
      });
    },
  });
}
