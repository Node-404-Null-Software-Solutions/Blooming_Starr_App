import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type EmployeeRepositoryClient = {
  employee: PrismaClient["employee"];
};

export type TenantEmployeeCreateInput = Omit<
  Prisma.EmployeeUncheckedCreateInput,
  "businessId"
>;

export type TenantEmployeeUpdateInput = Omit<
  Prisma.EmployeeUncheckedUpdateManyInput,
  "businessId"
>;

export type TenantEmployeeWhereInput = Omit<
  Prisma.EmployeeWhereInput,
  "businessId" | "business"
>;

export function createEmployeeRepository(
  context: BusinessContext,
  client: EmployeeRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(
      where?: TenantEmployeeWhereInput,
      orderBy:
        | Prisma.EmployeeOrderByWithRelationInput
        | Prisma.EmployeeOrderByWithRelationInput[] = [
        { status: "asc" },
        { name: "asc" },
      ]
    ) {
      return client.employee.findMany({
        where: withBusinessScope(businessId, where),
        orderBy,
      });
    },

    findById(id: string) {
      return client.employee.findFirst({
        where: withBusinessScope(businessId, { id }),
      });
    },

    listForManagement() {
      return client.employee.findMany({
        where: { businessId },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          position: true,
          hourlyRateCents: true,
          salaryRateCents: true,
          status: true,
          notes: true,
        },
      });
    },

    listActiveForSchedule() {
      return client.employee.findMany({
        where: withBusinessScope(businessId, { status: "ACTIVE" }),
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    },

    create(data: TenantEmployeeCreateInput) {
      return client.employee.create({
        data: withBusinessData(businessId, data),
      });
    },

    async updateById(id: string, data: TenantEmployeeUpdateInput) {
      const result = await client.employee.updateMany({
        where: { businessId, id },
        data,
      });
      return result.count === 1;
    },
  });
}
