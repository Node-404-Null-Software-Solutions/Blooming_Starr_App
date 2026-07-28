import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type TransplantLogRepositoryClient = {
  transplantLog: PrismaClient["transplantLog"];
};

export type TenantTransplantLogCreateInput = Omit<
  Prisma.TransplantLogUncheckedCreateInput,
  "businessId"
>;

export type TenantTransplantLogCreateManyInput = Omit<
  Prisma.TransplantLogCreateManyInput,
  "businessId"
>;

export type TenantTransplantLogUpdateInput = Omit<
  Prisma.TransplantLogUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantTransplantLogWhereInput = Omit<
  Prisma.TransplantLogWhereInput,
  "businessId" | "business"
>;

export function createTransplantLogRepository(
  context: BusinessContext,
  client: TransplantLogRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantTransplantLogWhereInput,
      orderBy:
        | Prisma.TransplantLogOrderByWithRelationInput
        | Prisma.TransplantLogOrderByWithRelationInput[] = [
        { date: "desc" },
        { createdAt: "desc" },
      ]
    ) {
      return client.transplantLog.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.transplantLog.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    findLatestForOriginalSku(originalSku: string) {
      return client.transplantLog.findFirst({
        where: withBusinessScope(businessId, { originalSku }),
        select: { fromPot: true, costCents: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    },

    countDivisionActions(originalSku: string) {
      return client.transplantLog.count({
        where: withBusinessScope(businessId, {
          originalSku,
          action: { contains: "ivision" },
        }),
      });
    },

    listDistinctDivisionSkus() {
      return client.transplantLog.findMany({
        where: withBusinessScope(businessId, { divisionSku: { not: null } }),
        select: { divisionSku: true },
        distinct: ["divisionSku"],
      });
    },

    listInventoryFacts() {
      return client.transplantLog.findMany({
        where: { businessId },
        select: { originalSku: true, divisionSku: true, costCents: true },
      });
    },

    listScannerDivisions() {
      return client.transplantLog.findMany({
        where: withBusinessScope(businessId, { divisionSku: { not: null } }),
        select: { divisionSku: true, originalSku: true },
      });
    },

    listForImportDeduplication() {
      return client.transplantLog.findMany({
        where: { businessId },
        select: {
          originalSku: true,
          date: true,
          action: true,
          divisionSku: true,
        },
      });
    },

    create(data: TenantTransplantLogCreateInput) {
      return client.transplantLog.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantTransplantLogUpdateInput) {
      const result = await client.transplantLog.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.transplantLog.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },

    async deleteByIds(ids: string[]) {
      if (ids.length === 0) return 0;
      const result = await client.transplantLog.deleteMany({
        where: { businessId, id: { in: ids } },
      });
      return result.count;
    },

    createMany(
      data: TenantTransplantLogCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.transplantLog.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.transplantLog.deleteMany({ where: { businessId } });
    },
  });
}
