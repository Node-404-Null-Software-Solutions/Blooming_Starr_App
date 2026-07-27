import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import {
  withBusinessData,
  withBusinessScope,
} from "@/lib/repositories/tenant-scope";

type LookupEntryRepositoryClient = {
  lookupEntry: PrismaClient["lookupEntry"];
};

export type TenantLookupEntryCreateManyInput = Omit<
  Prisma.LookupEntryCreateManyInput,
  "businessId"
>;

export type TenantLookupEntryWhereInput = Omit<
  Prisma.LookupEntryWhereInput,
  "businessId" | "business"
>;

export function createLookupEntryRepository(
  context: BusinessContext,
  client: LookupEntryRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    list(where?: TenantLookupEntryWhereInput) {
      return client.lookupEntry.findMany({
        where: withBusinessScope(businessId, where),
        select: {
          id: true,
          table: true,
          name: true,
          code: true,
          parentCode: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    },

    createMany(
      data: TenantLookupEntryCreateManyInput[],
      options: { skipDuplicates?: boolean } = {}
    ) {
      return client.lookupEntry.createMany({
        data: data.map((row) => withBusinessData(businessId, row)),
        skipDuplicates: options.skipDuplicates,
      });
    },

    deleteAll() {
      return client.lookupEntry.deleteMany({ where: { businessId } });
    },
  });
}
