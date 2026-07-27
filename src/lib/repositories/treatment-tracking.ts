import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type TreatmentTrackingRepositoryClient = {
  treatmentTracking: PrismaClient["treatmentTracking"];
};

export type TenantTreatmentTrackingCreateInput = Omit<
  Prisma.TreatmentTrackingUncheckedCreateInput,
  "businessId"
>;

export type TenantTreatmentTrackingCreateManyInput = Omit<
  Prisma.TreatmentTrackingCreateManyInput,
  "businessId"
>;

export type TenantTreatmentTrackingUpdateInput = Omit<
  Prisma.TreatmentTrackingUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantTreatmentTrackingWhereInput = Omit<
  Prisma.TreatmentTrackingWhereInput,
  "businessId" | "business"
>;

export function createTreatmentTrackingRepository(
  context: BusinessContext,
  client: TreatmentTrackingRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantTreatmentTrackingWhereInput,
      orderBy:
        | Prisma.TreatmentTrackingOrderByWithRelationInput
        | Prisma.TreatmentTrackingOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.treatmentTracking.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.treatmentTracking.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit: number) {
      return client.treatmentTracking.findMany({
        where: { businessId },
        select: {
          id: true,
          date: true,
          sku: true,
          product: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: limit,
      });
    },

    listForImportDeduplication() {
      return client.treatmentTracking.findMany({
        where: { businessId },
        select: {
          sku: true,
          date: true,
          target: true,
          product: true,
        },
      });
    },

    create(data: TenantTreatmentTrackingCreateInput) {
      return client.treatmentTracking.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantTreatmentTrackingUpdateInput) {
      const result = await client.treatmentTracking.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.treatmentTracking.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantTreatmentTrackingCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.treatmentTracking.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.treatmentTracking.deleteMany({ where: { businessId } });
    },
  });
}
