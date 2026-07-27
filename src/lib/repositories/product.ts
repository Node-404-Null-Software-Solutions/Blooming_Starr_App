import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createTenantScopedClient } from "@/lib/db";
import { withBusinessData } from "@/lib/repositories/tenant-scope";

type ProductRepositoryClient = {
  product: PrismaClient["product"];
};

export type TenantProductCreateInput = Omit<
  Prisma.ProductUncheckedCreateInput,
  "businessId"
>;

export type TenantProductUpdateInput = Omit<
  Prisma.ProductUncheckedUpdateInput,
  "businessId" | "sku"
>;

export function createProductRepository(
  context: BusinessContext,
  client: ProductRepositoryClient = createTenantScopedClient(context)
) {
  const businessId = context.businessId;

  return Object.freeze({
    findBySku(sku: string) {
      return client.product.findUnique({
        where: { businessId_sku: { businessId, sku } },
      });
    },

    async skuExists(sku: string) {
      const product = await client.product.findUnique({
        where: { businessId_sku: { businessId, sku } },
        select: { id: true },
      });
      return product !== null;
    },

    create(data: TenantProductCreateInput) {
      return client.product.create({
        data: withBusinessData(businessId, data),
      });
    },

    upsertBySku(
      sku: string,
      create: Omit<TenantProductCreateInput, "sku">,
      update: TenantProductUpdateInput
    ) {
      return client.product.upsert({
        where: { businessId_sku: { businessId, sku } },
        create: withBusinessData(businessId, { ...create, sku }),
        update,
      });
    },
  });
}
