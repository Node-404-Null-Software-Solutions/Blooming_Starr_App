import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type PlantIntakeRepositoryClient = {
  plantIntake: PrismaClient["plantIntake"];
};

export type TenantPlantIntakeCreateInput = Omit<
  Prisma.PlantIntakeUncheckedCreateInput,
  "businessId"
>;

export type TenantPlantIntakeCreateManyInput = Omit<
  Prisma.PlantIntakeCreateManyInput,
  "businessId"
>;

export type TenantPlantIntakeUpdateInput = Omit<
  Prisma.PlantIntakeUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantPlantIntakeWhereInput = Omit<
  Prisma.PlantIntakeWhereInput,
  "businessId" | "business"
>;

export function createPlantIntakeRepository(
  context: BusinessContext,
  client: PlantIntakeRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantPlantIntakeWhereInput,
      orderBy:
        | Prisma.PlantIntakeOrderByWithRelationInput
        | Prisma.PlantIntakeOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.plantIntake.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.plantIntake.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit: number) {
      return client.plantIntake.findMany({
        where: { businessId },
        select: {
          id: true,
          date: true,
          sku: true,
          genus: true,
          cultivar: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: limit,
      });
    },

    findLatestBySku(sku: string) {
      return client.plantIntake.findFirst({
        where: withBusinessScope(businessId, { sku }),
        select: { costCents: true },
        orderBy: { createdAt: "desc" },
      });
    },

    listDistinctGenera() {
      return client.plantIntake.findMany({
        where: { businessId },
        distinct: ["genus"],
        select: { genus: true },
        orderBy: { genus: "asc" },
      });
    },

    listDistinctSkus() {
      return client.plantIntake.findMany({
        where: { businessId },
        select: { sku: true },
        orderBy: { sku: "asc" },
        distinct: ["sku"],
      });
    },

    listExistingSkus(skus: string[]) {
      return client.plantIntake.findMany({
        where: withBusinessScope(businessId, { sku: { in: skus } }),
        select: { sku: true },
      });
    },

    listInventoryFacts() {
      return client.plantIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          date: true,
          genus: true,
          cultivar: true,
          costCents: true,
          msrpCents: true,
          qty: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    },

    listForScanner() {
      return client.plantIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          genus: true,
          cultivar: true,
          qty: true,
          costCents: true,
          msrpCents: true,
          status: true,
        },
      });
    },

    listForDashboard(where?: TenantPlantIntakeWhereInput) {
      return client.plantIntake.findMany({
        where: withBusinessScope(businessId, where),
        select: {
          sku: true,
          status: true,
          costCents: true,
          msrpCents: true,
          qty: true,
        },
      });
    },

    create(data: TenantPlantIntakeCreateInput) {
      return client.plantIntake.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantPlantIntakeUpdateInput) {
      const result = await client.plantIntake.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.plantIntake.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(data: TenantPlantIntakeCreateManyInput[]) {
      return client.plantIntake.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
      });
    },

    deleteAll() {
      return client.plantIntake.deleteMany({ where: { businessId } });
    },
  });
}
