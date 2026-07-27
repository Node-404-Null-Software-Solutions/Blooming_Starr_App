import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type ProductIntakeRepositoryClient = {
  productIntake: PrismaClient["productIntake"];
};

export type TenantProductIntakeCreateInput = Omit<
  Prisma.ProductIntakeUncheckedCreateInput,
  "businessId"
>;

export type TenantProductIntakeCreateManyInput = Omit<
  Prisma.ProductIntakeCreateManyInput,
  "businessId"
>;

export type TenantProductIntakeUpdateInput = Omit<
  Prisma.ProductIntakeUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantProductIntakeWhereInput = Omit<
  Prisma.ProductIntakeWhereInput,
  "businessId" | "business"
>;

export function createProductIntakeRepository(
  context: BusinessContext,
  client: ProductIntakeRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantProductIntakeWhereInput,
      orderBy:
        | Prisma.ProductIntakeOrderByWithRelationInput
        | Prisma.ProductIntakeOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.productIntake.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.productIntake.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit = 50) {
      return client.productIntake.findMany({
        where: { businessId },
        select: { id: true, sku: true, category: true, date: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: Math.max(1, Math.min(100, Math.floor(limit))),
      });
    },

    listDistinctSkus() {
      return client.productIntake.findMany({
        where: { businessId },
        select: { sku: true },
        distinct: ["sku"],
      });
    },

    listInventoryFacts() {
      return client.productIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          date: true,
          vendor: true,
          category: true,
          size: true,
          style: true,
          qty: true,
          totalCostCents: true,
          unitCostCents: true,
          notes: true,
          createdAt: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    },

    listForScanner() {
      return client.productIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          vendor: true,
          category: true,
          size: true,
          style: true,
          qty: true,
          unitCostCents: true,
        },
      });
    },

    listForImportDeduplication() {
      return client.productIntake.findMany({
        where: { businessId },
        select: { sku: true, date: true },
      });
    },

    create(data: TenantProductIntakeCreateInput) {
      return client.productIntake.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantProductIntakeUpdateInput) {
      const result = await client.productIntake.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.productIntake.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantProductIntakeCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.productIntake.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.productIntake.deleteMany({ where: { businessId } });
    },
  });
}
