import { Prisma, type PrismaClient } from "@prisma/client";
import {
  buildFinalSku,
  isSkuReferenceScope,
  isValidReferenceCode,
  normalizeName,
  normalizeReferenceCode,
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

function scopeToPrisma(scope: SkuReferenceScope) {
  return scope;
}

export async function getOrCreateSkuReference(
  tx: DbClient,
  businessId: string,
  scope: SkuReferenceScope,
  displayName: string
): Promise<ResolvedReference> {
  if (!isSkuReferenceScope(scope)) {
    throw new Error("Invalid SKU reference scope");
  }

  const trimmedName = displayName.trim();
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) {
    throw new Error("SKU reference name is required");
  }

  const existing = await tx.plantSkuReference.findFirst({
    where: {
      businessId,
      scope: scopeToPrisma(scope),
      normalizedName,
      active: true,
    },
    select: { displayName: true, code: true },
  });
  if (existing) {
    return {
      displayName: existing.displayName,
      code: existing.code,
      source: "reference",
      created: false,
    };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const existingCodes = await tx.plantSkuReference.findMany({
      where: { businessId, scope: scopeToPrisma(scope), active: true },
      select: { code: true },
    });
    const code = resolveUniqueCodeCandidate(
      normalizedName,
      existingCodes.map((row) => row.code)
    );

    try {
      const created = await tx.plantSkuReference.create({
        data: {
          businessId,
          scope: scopeToPrisma(scope),
          displayName: trimmedName,
          normalizedName,
          code,
          active: true,
          notes: GENERATED_NOTES,
        },
        select: { displayName: true, code: true },
      });
      return {
        displayName: created.displayName,
        code: created.code,
        source: "generated",
        created: true,
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const nowExisting = await tx.plantSkuReference.findFirst({
        where: {
          businessId,
          scope: scopeToPrisma(scope),
          normalizedName,
          active: true,
        },
        select: { displayName: true, code: true },
      });
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
  businessId: string,
  scope: SkuReferenceScope,
  displayName: string
): Promise<ResolvedReference> {
  const trimmedName = displayName.trim();
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) {
    throw new Error("SKU reference name is required");
  }

  const existing = await tx.plantSkuReference.findFirst({
    where: {
      businessId,
      scope: scopeToPrisma(scope),
      normalizedName,
      active: true,
    },
    select: { displayName: true, code: true },
  });
  if (existing) {
    return {
      displayName: existing.displayName,
      code: existing.code,
      source: "reference",
      created: false,
    };
  }

  const existingCodes = await tx.plantSkuReference.findMany({
    where: { businessId, scope: scopeToPrisma(scope), active: true },
    select: { code: true },
  });

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
  businessId: string,
  input: PlantSkuInput
): Promise<PlantSkuResult> {
  const plantName = normalizeName(input.plantName);
  if (!plantName) {
    throw new Error("Plant name is required");
  }

  const plant = await previewSkuReference(tx, businessId, "plant", input.plantName);
  const categoryName = normalizeName(input.categoryName);
  const varietyName = normalizeName(input.varietyName);
  const category = categoryName
    ? await previewSkuReference(tx, businessId, "category", input.categoryName ?? "")
    : null;
  const variety = varietyName
    ? await previewSkuReference(tx, businessId, "variety", input.varietyName ?? "")
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
  businessId: string,
  input: PlantSkuInput
): Promise<PlantSkuResult> {
  const plantName = normalizeName(input.plantName);
  if (!plantName) {
    throw new Error("Plant name is required");
  }

  const plant = await getOrCreateSkuReference(tx, businessId, "plant", input.plantName);
  const categoryName = normalizeName(input.categoryName);
  const varietyName = normalizeName(input.varietyName);
  const category = categoryName
    ? await getOrCreateSkuReference(tx, businessId, "category", input.categoryName ?? "")
    : null;
  const variety = varietyName
    ? await getOrCreateSkuReference(tx, businessId, "variety", input.varietyName ?? "")
    : null;
  const suffix = normalizeSuffix(input.suffix);
  const baseSku = buildFinalSku({
    plant: plant.code,
    category: category?.code,
    variety: variety?.code,
    suffix,
  });
  const sku = await resolveUniqueFinalSku(tx, businessId, baseSku);

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
  businessId: string,
  baseSku: string
): Promise<string> {
  for (let counter = 1; counter < Number.MAX_SAFE_INTEGER; counter++) {
    const candidate = counter === 1 ? baseSku : `${baseSku}-${counter}`;
    const existing = await tx.product.findUnique({
      where: { businessId_sku: { businessId, sku: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Unable to resolve a unique SKU");
}

export async function createSkuReference(
  tx: DbClient,
  businessId: string,
  input: {
    scope: string;
    displayName: string;
    code: string;
    active?: boolean;
    notes?: string | null;
  }
) {
  if (!isSkuReferenceScope(input.scope)) {
    throw new Error("Reference scope must be plant, category, or variety");
  }

  const displayName = input.displayName.trim();
  const normalizedName = normalizeName(displayName);
  const code = normalizeReferenceCode(input.code);
  if (!displayName) throw new Error("Display name is required");
  if (!code) throw new Error("Code is required");
  if (!isValidReferenceCode(code)) {
    throw new Error("Code must be uppercase and contain only A-Z, 0-9, or numeric suffixes");
  }

  return tx.plantSkuReference.create({
    data: {
      businessId,
      scope: input.scope,
      displayName,
      normalizedName,
      code,
      active: input.active ?? true,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function updateSkuReference(
  tx: DbClient,
  businessId: string,
  id: string,
  data: {
    displayName?: string;
    code?: string;
    active?: boolean;
    notes?: string | null;
  }
) {
  const existing = await tx.plantSkuReference.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Not found");

  const update: Record<string, unknown> = {};
  if (data.displayName !== undefined) {
    const displayName = data.displayName.trim();
    if (!displayName) throw new Error("Display name is required");
    update.displayName = displayName;
    update.normalizedName = normalizeName(displayName);
  }
  if (data.code !== undefined) {
    const code = normalizeReferenceCode(data.code);
    if (!code) throw new Error("Code is required");
    if (!isValidReferenceCode(code)) {
      throw new Error("Code must be uppercase and contain only A-Z, 0-9, or numeric suffixes");
    }
    update.code = code;
  }
  if (data.active !== undefined) update.active = data.active;
  if (data.notes !== undefined) update.notes = data.notes?.trim() || null;

  return tx.plantSkuReference.update({ where: { id }, data: update });
}

export function duplicateSkuReferenceMessage(error: unknown): string | null {
  if (isUniqueConstraintError(error)) return "Duplicate reference name or code";
  return null;
}
