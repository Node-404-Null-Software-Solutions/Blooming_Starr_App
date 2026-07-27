import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type SalesRepositoryClient = Pick<PrismaClient, "salesEntry">;

export type TenantSalesCreateInput = Omit<
  Prisma.SalesEntryUncheckedCreateInput,
  "businessId"
>;

export type TenantSalesCreateManyInput = Omit<
  Prisma.SalesEntryCreateManyInput,
  "businessId"
>;

export type TenantSalesUpdateInput = Omit<
  Prisma.SalesEntryUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantSalesWhereInput = Omit<
  Prisma.SalesEntryWhereInput,
  "businessId" | "business"
>;

export function createSalesRepository(
  context: BusinessContext,
  client: SalesRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantSalesWhereInput,
      orderBy:
        | Prisma.SalesEntryOrderByWithRelationInput
        | Prisma.SalesEntryOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.salesEntry.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.salesEntry.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit = 50) {
      return client.salesEntry.findMany({
        where: { businessId },
        select: { id: true, sku: true, itemName: true, date: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: Math.max(1, Math.min(100, Math.floor(limit))),
      });
    },

    listForSkuSync(sku: string) {
      return client.salesEntry.findMany({
        where: withBusinessScope(businessId, { sku }),
        select: { id: true, qty: true },
      });
    },

    listInventoryFacts() {
      return client.salesEntry.findMany({
        where: { businessId },
        select: {
          sku: true,
          qty: true,
          salePriceCents: true,
          totalSaleCents: true,
          profitCents: true,
          marginPct: true,
        },
      });
    },

    listForImportDeduplication() {
      return client.salesEntry.findMany({
        where: { businessId },
        select: {
          sku: true,
          date: true,
          qty: true,
          salePriceCents: true,
          channel: true,
        },
      });
    },

    listForTaxSummary(where?: TenantSalesWhereInput) {
      return client.salesEntry.findMany({
        where: withBusinessScope(businessId, where),
        select: {
          date: true,
          createdAt: true,
          sku: true,
          totalSaleCents: true,
          costCents: true,
          profitCents: true,
          channel: true,
        },
        orderBy: { date: "asc" },
      });
    },

    create(data: TenantSalesCreateInput) {
      return client.salesEntry.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantSalesUpdateInput) {
      const result = await client.salesEntry.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.salesEntry.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantSalesCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.salesEntry.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.salesEntry.deleteMany({ where: { businessId } });
    },
  });
}
