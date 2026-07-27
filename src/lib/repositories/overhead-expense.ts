import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type OverheadExpenseRepositoryClient = {
  overheadExpense: PrismaClient["overheadExpense"];
};

export type TenantOverheadExpenseCreateInput = Omit<
  Prisma.OverheadExpenseUncheckedCreateInput,
  "businessId"
>;

export type TenantOverheadExpenseCreateManyInput = Omit<
  Prisma.OverheadExpenseCreateManyInput,
  "businessId"
>;

export type TenantOverheadExpenseUpdateInput = Omit<
  Prisma.OverheadExpenseUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantOverheadExpenseWhereInput = Omit<
  Prisma.OverheadExpenseWhereInput,
  "businessId" | "business"
>;

export function createOverheadExpenseRepository(
  context: BusinessContext,
  client: OverheadExpenseRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantOverheadExpenseWhereInput,
      orderBy:
        | Prisma.OverheadExpenseOrderByWithRelationInput
        | Prisma.OverheadExpenseOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.overheadExpense.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.overheadExpense.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit = 50) {
      return client.overheadExpense.findMany({
        where: { businessId },
        select: { id: true, vendor: true, description: true, date: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: Math.max(1, Math.min(100, Math.floor(limit))),
      });
    },

    listForImportDeduplication() {
      return client.overheadExpense.findMany({
        where: { businessId },
        select: {
          date: true,
          vendor: true,
          invoiceNumber: true,
          totalCents: true,
        },
      });
    },

    summarizeByCategory(where?: TenantOverheadExpenseWhereInput) {
      return client.overheadExpense.groupBy({
        by: ["category"],
        where: withBusinessScope(businessId, where),
        _sum: { totalCents: true },
      });
    },

    listForTaxSummary(where?: TenantOverheadExpenseWhereInput) {
      return client.overheadExpense.findMany({
        where: withBusinessScope(businessId, where),
        select: {
          id: true,
          date: true,
          vendor: true,
          category: true,
          description: true,
          totalCents: true,
        },
        orderBy: { date: "asc" },
      });
    },

    create(data: TenantOverheadExpenseCreateInput) {
      return client.overheadExpense.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantOverheadExpenseUpdateInput) {
      const result = await client.overheadExpense.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.overheadExpense.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantOverheadExpenseCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.overheadExpense.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.overheadExpense.deleteMany({ where: { businessId } });
    },
  });
}
