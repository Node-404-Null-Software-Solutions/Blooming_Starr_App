import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type PricingEntryRepositoryClient = {
  pricingEntry: PrismaClient["pricingEntry"];
};

export type TenantPricingEntryCreateInput = Omit<
  Prisma.PricingEntryUncheckedCreateInput,
  "businessId"
>;

export type TenantPricingEntryCreateManyInput = Omit<
  Prisma.PricingEntryCreateManyInput,
  "businessId"
>;

export type TenantPricingEntryUpdateInput = Omit<
  Prisma.PricingEntryUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantPricingEntryWhereInput = Omit<
  Prisma.PricingEntryWhereInput,
  "businessId" | "business"
>;

export function createPricingEntryRepository(
  context: BusinessContext,
  client: PricingEntryRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantPricingEntryWhereInput,
      orderBy:
        | Prisma.PricingEntryOrderByWithRelationInput
        | Prisma.PricingEntryOrderByWithRelationInput[] = { updatedAt: "desc" }
    ) {
      return client.pricingEntry.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.pricingEntry.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listInventoryFacts() {
      return client.pricingEntry.findMany({
        where: { businessId },
        select: {
          sku: true,
          date: true,
          productName: true,
          plantCostCents: true,
          potOrProdCostCents: true,
          overheadCents: true,
          totalCostCents: true,
          estimatedSellPriceCents: true,
          actualSellPriceCents: true,
          profitCents: true,
          marginPct: true,
          status: true,
          notes: true,
          msrpCents: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    },

    create(data: TenantPricingEntryCreateInput) {
      return client.pricingEntry.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantPricingEntryUpdateInput) {
      const result = await client.pricingEntry.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.pricingEntry.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantPricingEntryCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.pricingEntry.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.pricingEntry.deleteMany({ where: { businessId } });
    },
  });
}
