import type { Prisma, PrismaClient } from "@prisma/client";
import type { BusinessContext } from "@/lib/business-context";
import { createPlantSkuReferenceRepository } from "@/lib/repositories/plant-sku-reference";
import { createProductRepository } from "@/lib/repositories/product";
import {
  buildFinalSku,
  isSkuReferenceScope,
  normalizeName,
  normalizeSuffix,
  resolveUniqueCodeCandidate,
  type SkuReferenceScope,
  type SkuSegmentSource,
} from "@/lib/sku";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type PlantSkuInput = {
  plantName: string;
  categoryName?: string | null;
  varietyName?: string | null;
  suffix?: string | null;
};

export type PlantSkuResult = {
  sku: string;
  segments: {
    plant: string;
    category?: string;
    variety?: string;
    suffix?: string;
  };
  sources: {
    plant: "reference" | "generated";
    category: "reference" | "generated" | "omitted";
    variety: "reference" | "generated" | "omitted";
    suffix: "provided" | "omitted";
  };
  createdReference: boolean;
};

type ResolvedReference = {
  displayName: string;
  code: string;
  source: Extract<SkuSegmentSource, "reference" | "generated">;
  created: boolean;
};

const GENERATED_NOTES = "System-generated fallback SKU segment code";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function getOrCreateSkuReference(
  tx: DbClient,
  businessContext: BusinessContext,
  scope: SkuReferenceScope,
  displayName: string
): Promise<ResolvedReference> {
  if (!isSkuReferenceScope(scope)) {
    throw new Error("Invalid SKU reference scope");
  }
  const references = createPlantSkuReferenceRepository(businessContext, tx);

  const trimmedName = displayName.trim();
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) {
    throw new Error("SKU reference name is required");
  }

  const existing = await references.findActiveByNormalizedName(
    scope,
    normalizedName
  );
  if (existing) {
    return {
      displayName: existing.displayName,
      code: existing.code,
      source: "reference",
      created: false,
    };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const existingCodes = await references.listActiveCodes(scope);
    const code = resolveUniqueCodeCandidate(
      normalizedName,
      existingCodes.map((row) => row.code)
    );

    try {
      const created = await references.create({
        scope,
        displayName: trimmedName,
        normalizedName,
        code,
        active: true,
        notes: GENERATED_NOTES,
      });
      return {
        displayName: created.displayName,
        code: created.code,
        source: "generated",
        created: true,
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const nowExisting = await references.findActiveByNormalizedName(
        scope,
        normalizedName
      );
      if (nowExisting) {
        return {
          displayName: nowExisting.displayName,
          code: nowExisting.code,
          source: "reference",
          created: false,
        };
      }
    }
  }

  throw new Error(`Unable to create SKU reference for ${scope}: ${trimmedName}`);
}

async function previewSkuReference(
  tx: DbClient,
  businessContext: BusinessContext,
  scope: SkuReferenceScope,
  displayName: string
): Promise<ResolvedReference> {
  const trimmedName = displayName.trim();
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) {
    throw new Error("SKU reference name is required");
  }
  const references = createPlantSkuReferenceRepository(businessContext, tx);

  const existing = await references.findActiveByNormalizedName(scope, normalizedName);
  if (existing) {
    return {
      displayName: existing.displayName,
      code: existing.code,
      source: "reference",
      created: false,
    };
  }

  const existingCodes = await references.listActiveCodes(scope);

  return {
    displayName: trimmedName,
    code: resolveUniqueCodeCandidate(
      normalizedName,
      existingCodes.map((row) => row.code)
    ),
    source: "generated",
    created: false,
  };
}

export async function previewSku(
  tx: DbClient,
  businessContext: BusinessContext,
  input: PlantSkuInput
): Promise<PlantSkuResult> {
  const plantName = normalizeName(input.plantName);
  if (!plantName) {
    throw new Error("Plant name is required");
  }

  const plant = await previewSkuReference(
    tx,
    businessContext,
    "plant",
    input.plantName
  );
  const categoryName = normalizeName(input.categoryName);
  const varietyName = normalizeName(input.varietyName);
  const category = categoryName
    ? await previewSkuReference(
        tx,
        businessContext,
        "category",
        input.categoryName ?? ""
      )
    : null;
  const variety = varietyName
    ? await previewSkuReference(
        tx,
        businessContext,
        "variety",
        input.varietyName ?? ""
      )
    : null;
  const suffix = normalizeSuffix(input.suffix);
  const sku = buildFinalSku({
    plant: plant.code,
    category: category?.code,
    variety: variety?.code,
    suffix,
  });

  return {
    sku,
    segments: {
      plant: plant.code,
      ...(category ? { category: category.code } : {}),
      ...(variety ? { variety: variety.code } : {}),
      ...(suffix ? { suffix } : {}),
    },
    sources: {
      plant: plant.source,
      category: category?.source ?? "omitted",
      variety: variety?.source ?? "omitted",
      suffix: suffix ? "provided" : "omitted",
    },
    createdReference:
      plant.created || Boolean(category?.created) || Boolean(variety?.created),
  };
}

export async function generateSku(
  tx: DbClient,
  businessContext: BusinessContext,
  input: PlantSkuInput
): Promise<PlantSkuResult> {
  const plantName = normalizeName(input.plantName);
  if (!plantName) {
    throw new Error("Plant name is required");
  }

  const plant = await getOrCreateSkuReference(
    tx,
    businessContext,
    "plant",
    input.plantName
  );
  const categoryName = normalizeName(input.categoryName);
  const varietyName = normalizeName(input.varietyName);
  const category = categoryName
    ? await getOrCreateSkuReference(
        tx,
        businessContext,
        "category",
        input.categoryName ?? ""
      )
    : null;
  const variety = varietyName
    ? await getOrCreateSkuReference(
        tx,
        businessContext,
        "variety",
        input.varietyName ?? ""
      )
    : null;
  const suffix = normalizeSuffix(input.suffix);
  const baseSku = buildFinalSku({
    plant: plant.code,
    category: category?.code,
    variety: variety?.code,
    suffix,
  });
  const sku = await resolveUniqueFinalSku(tx, businessContext, baseSku);

  return {
    sku: sku,
    segments: {
      plant: plant.code,
      ...(category ? { category: category.code } : {}),
      ...(variety ? { variety: variety.code } : {}),
      ...(suffix ? { suffix } : {}),
    },
    sources: {
      plant: plant.source,
      category: category?.source ?? "omitted",
      variety: variety?.source ?? "omitted",
      suffix: suffix ? "provided" : "omitted",
    },
    createdReference:
      plant.created || Boolean(category?.created) || Boolean(variety?.created),
  };
}

export async function resolveUniqueFinalSku(
  tx: DbClient,
  businessContext: BusinessContext,
  baseSku: string
): Promise<string> {
  const products = createProductRepository(businessContext, tx);
  for (let counter = 1; counter < Number.MAX_SAFE_INTEGER; counter++) {
    const candidate = counter === 1 ? baseSku : `${baseSku}-${counter}`;
    if (!(await products.skuExists(candidate))) return candidate;
  }

  throw new Error("Unable to resolve a unique SKU");
}
