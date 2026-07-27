import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type FertilizerLogRepositoryClient = {
  fertilizerLog: PrismaClient["fertilizerLog"];
};

export type TenantFertilizerLogCreateInput = Omit<
  Prisma.FertilizerLogUncheckedCreateInput,
  "businessId"
>;

export type TenantFertilizerLogCreateManyInput = Omit<
  Prisma.FertilizerLogCreateManyInput,
  "businessId"
>;

export type TenantFertilizerLogUpdateInput = Omit<
  Prisma.FertilizerLogUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantFertilizerLogWhereInput = Omit<
  Prisma.FertilizerLogWhereInput,
  "businessId" | "business"
>;

export function createFertilizerLogRepository(
  context: BusinessContext,
  client: FertilizerLogRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantFertilizerLogWhereInput,
      orderBy:
        | Prisma.FertilizerLogOrderByWithRelationInput
        | Prisma.FertilizerLogOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.fertilizerLog.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.fertilizerLog.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForImportDeduplication() {
      return client.fertilizerLog.findMany({
        where: { businessId },
        select: {
          plantSku: true,
          date: true,
          product: true,
          method: true,
        },
      });
    },

    create(data: TenantFertilizerLogCreateInput) {
      return client.fertilizerLog.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantFertilizerLogUpdateInput) {
      const result = await client.fertilizerLog.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.fertilizerLog.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    createMany(
      data: TenantFertilizerLogCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.fertilizerLog.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.fertilizerLog.deleteMany({ where: { businessId } });
    },
  });
}
