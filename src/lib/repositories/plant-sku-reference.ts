import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type PlantSkuReferenceRepositoryClient = {
  plantSkuReference: PrismaClient["plantSkuReference"];
};

export type TenantPlantSkuReferenceCreateInput = Omit<
  Prisma.PlantSkuReferenceUncheckedCreateInput,
  "businessId"
>;

export type TenantPlantSkuReferenceUpdateInput = Omit<
  Prisma.PlantSkuReferenceUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantPlantSkuReferenceWhereInput = Omit<
  Prisma.PlantSkuReferenceWhereInput,
  "businessId" | "business"
>;

export function createPlantSkuReferenceRepository(
  context: BusinessContext,
  client: PlantSkuReferenceRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(where?: TenantPlantSkuReferenceWhereInput) {
      return client.plantSkuReference.findMany({
        where: withBusinessScope(businessId, where),
        orderBy: [{ scope: "asc" }, { displayName: "asc" }],
      });
    },

    findActiveByNormalizedName(
      scope: "plant" | "category" | "variety",
      normalizedName: string
    ) {
      return client.plantSkuReference.findFirst({
        where: withBusinessScope(businessId, {
          scope,
          normalizedName,
          active: true,
        }),
        select: { displayName: true, code: true },
      });
    },

    listActiveCodes(scope: "plant" | "category" | "variety") {
      return client.plantSkuReference.findMany({
        where: withBusinessScope(businessId, { scope, active: true }),
        select: { code: true },
      });
    },

    create(data: TenantPlantSkuReferenceCreateInput) {
      return client.plantSkuReference.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantPlantSkuReferenceUpdateInput) {
      const result = await client.plantSkuReference.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.plantSkuReference.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },
  });
}
