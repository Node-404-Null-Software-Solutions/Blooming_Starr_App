import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type ScheduleEntryRepositoryClient = {
  scheduleEntry: PrismaClient["scheduleEntry"];
};

export type TenantScheduleEntryCreateInput = Omit<
  Prisma.ScheduleEntryUncheckedCreateInput,
  "businessId"
>;

export type TenantScheduleEntryUpdateInput = Omit<
  Prisma.ScheduleEntryUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantScheduleEntryWhereInput = Omit<
  Prisma.ScheduleEntryWhereInput,
  "businessId" | "business"
>;

export function createScheduleEntryRepository(
  context: BusinessContext,
  client: ScheduleEntryRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantScheduleEntryWhereInput,
      orderBy:
        | Prisma.ScheduleEntryOrderByWithRelationInput
        | Prisma.ScheduleEntryOrderByWithRelationInput[] = { startTime: "asc" }
    ) {
      return client.scheduleEntry.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.scheduleEntry.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManualRun(limit: number) {
      return client.scheduleEntry.findMany({
        where: { businessId },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          title: true,
          employee: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { startTime: "asc" }],
        take: limit,
      });
    },

    listForWeek(rangeStart: Date, rangeEnd: Date) {
      return client.scheduleEntry.findMany({
        where: withBusinessScope(businessId, {
          date: { gte: rangeStart, lte: rangeEnd },
        }),
        include: { employee: { select: { name: true } } },
        orderBy: { startTime: "asc" },
      });
    },

    create(data: TenantScheduleEntryCreateInput) {
      return client.scheduleEntry.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantScheduleEntryUpdateInput) {
      const result = await client.scheduleEntry.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },

    async deleteById(id: string) {
      const result = await client.scheduleEntry.deleteMany({
        where: { businessId, id },
      });
      return result.count === 1;
    },
  });
}
