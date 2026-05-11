"use server";

import { db } from "@/lib/db";
import { requireActiveMembership } from "@/lib/authz";
import {
  calculateDivisionCost,
  calculateOverheadDerived,
  calculateProductIntakeDerived,
  calculateSalesDerived,
  loadSalesDerivedCalculator,
} from "@/lib/app-logic-engine";
import { buildPlantSku, buildProductSku, suggestLookupCode } from "@/lib/sku";
import { revalidatePath } from "next/cache";

type ProductMasterFields = {
  productName?: string | null;
  defaultCostCents?: number;
  defaultSalePriceCents?: number;
};

async function upsertProductFromRow(
  businessId: string,
  sku: string,
  fields: ProductMasterFields
) {
  const updatePayload: Record<string, unknown> = {};
  if (fields.productName !== undefined) updatePayload.productName = fields.productName;
  if (fields.defaultCostCents !== undefined)
    updatePayload.defaultCostCents = fields.defaultCostCents;
  if (fields.defaultSalePriceCents !== undefined)
    updatePayload.defaultSalePriceCents = fields.defaultSalePriceCents;

  await db.product.upsert({
    where: { businessId_sku: { businessId, sku } },
    create: {
      businessId,
      sku,
      productName: fields.productName ?? null,
      defaultCostCents: fields.defaultCostCents ?? 0,
      defaultSalePriceCents: fields.defaultSalePriceCents ?? 0,
    },
    update: updatePayload,
  });
}

async function syncProductToSales(
  businessId: string,
  sku: string,
  businessSlug: string
) {
  const product = await db.product.findUnique({
    where: { businessId_sku: { businessId, sku } },
  });
  if (!product) return;

  const productName = product.productName ?? null;
  const defaultCostCents = product.defaultCostCents;
  const defaultSalePriceCents = product.defaultSalePriceCents;

  const salesRows = await db.salesEntry.findMany({
    where: { businessId, sku },
    select: { id: true, qty: true },
  });
  const calculateSales = await loadSalesDerivedCalculator(businessId);

  for (const row of salesRows) {
    const derived = calculateSales({
      qty: row.qty,
      salePriceCents: defaultSalePriceCents,
      costCents: defaultCostCents,
    });
    await db.salesEntry.update({
      where: { id: row.id },
      data: {
        itemName: productName,
        costCents: defaultCostCents,
        salePriceCents: defaultSalePriceCents,
        totalSaleCents: derived.totalSaleCents,
        profitCents: derived.profitCents,
        marginPct: derived.marginPct,
      },
    });
  }

  revalidatePath(`/app/${businessSlug}/sales`);
}

export type SalesEntryUpdate = {
  date?: string | null;
  sku?: string;
  itemName?: string | null;
  qty?: number;
  salePriceCents?: number;
  paymentMethod?: string | null;
  cardLast4?: string | null;
  channel?: string | null;
  costCents?: number;
  notes?: string | null;
};

export async function updateSalesEntry(
  id: string,
  businessSlug: string,
  data: SalesEntryUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const existing = await db.salesEntry.findFirst({
    where: { id, businessId },
  });
  if (!existing) return { ok: false, error: "Not found" };

  const qty = data.qty ?? existing.qty;
  const salePriceCents = data.salePriceCents ?? existing.salePriceCents;
  const costCents = data.costCents ?? existing.costCents;
  const derived = await calculateSalesDerived(
    businessId,
    qty,
    salePriceCents,
    costCents
  );

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  await db.salesEntry.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.itemName !== undefined && { itemName: data.itemName }),
      ...(data.qty !== undefined && { qty: data.qty }),
      ...(data.salePriceCents !== undefined && {
        salePriceCents: data.salePriceCents,
      }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod,
      }),
      ...(data.cardLast4 !== undefined && { cardLast4: data.cardLast4 }),
      ...(data.channel !== undefined && { channel: data.channel }),
      ...(data.costCents !== undefined && { costCents: data.costCents }),
      ...(data.notes !== undefined && { notes: data.notes }),
      totalSaleCents: derived.totalSaleCents,
      profitCents: derived.profitCents,
      marginPct: derived.marginPct,
    },
  });

  const skuAfter = data.sku ?? existing.sku;
  const itemNameAfter = data.itemName ?? existing.itemName;
  const costCentsAfter = data.costCents ?? existing.costCents;
  const salePriceCentsAfter = data.salePriceCents ?? existing.salePriceCents;
  await upsertProductFromRow(businessId, skuAfter, {
    productName: itemNameAfter,
    defaultCostCents: costCentsAfter,
    defaultSalePriceCents: salePriceCentsAfter,
  });
  await syncProductToSales(businessId, skuAfter, businessSlug);

  revalidatePath(`/app/${businessSlug}/sales`);
  return { ok: true };
}

function formCents(formData: FormData, key: string): number {
  const v = formData.get(key);
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function formStr(formData: FormData, key: string): string {
  const v = formData.get(key);
  return (v && String(v).trim()) || "";
}
function formDate(formData: FormData, key: string): Date | null {
  const v = formData.get(key);
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

type SkuLookupTable =
  | "plantSource"
  | "genus"
  | "cultivar"
  | "plantId"
  | "productSource"
  | "productCategory"
  | "productSize"
  | "productStyle";

type EnsuredLookup = {
  name: string;
  code: string;
  created: boolean;
};

type EnsureLookupOptions = {
  parentCode?: string | null;
  matchCode?: boolean;
  maxLength?: number;
  preserveCodeLike?: boolean;
  preserveNumericCodeLike?: boolean;
};

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function findLookupForValue(
  businessId: string,
  table: SkuLookupTable,
  value: string,
  matchCode = false
): Promise<Omit<EnsuredLookup, "created"> | null> {
  const name = value.trim();
  if (!name) return null;

  const byName = await db.lookupEntry.findFirst({
    where: {
      businessId,
      table,
      name: { equals: name, mode: "insensitive" },
    },
    select: { name: true, code: true },
  });
  if (byName) return byName;

  if (!matchCode) return null;

  return db.lookupEntry.findFirst({
    where: {
      businessId,
      table,
      code: { equals: name.toUpperCase(), mode: "insensitive" },
    },
    select: { name: true, code: true },
  });
}

async function ensureLookupEntry(
  businessId: string,
  table: SkuLookupTable,
  value: string,
  options: EnsureLookupOptions = {}
): Promise<EnsuredLookup> {
  const name = value.trim();
  if (!name) throw new Error("Lookup name is required");

  const existing = await findLookupForValue(
    businessId,
    table,
    name,
    options.matchCode
  );
  if (existing) return { ...existing, created: false };

  for (let attempt = 0; attempt < 5; attempt++) {
    const existingCodes = await db.lookupEntry.findMany({
      where: { businessId, table },
      select: { code: true },
    });
    const code = suggestLookupCode(
      name,
      existingCodes.map((row) => row.code),
      {
        maxLength: options.maxLength,
        preserveCodeLike: options.preserveCodeLike,
        preserveNumericCodeLike: options.preserveNumericCodeLike,
      }
    );

    try {
      const created = await db.lookupEntry.create({
        data: {
          businessId,
          table,
          name,
          code,
          parentCode: options.parentCode?.trim() || null,
        },
        select: { name: true, code: true },
      });
      return { ...created, created: true };
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) throw error;

      const nowExisting = await findLookupForValue(
        businessId,
        table,
        name,
        options.matchCode
      );
      if (nowExisting) return { ...nowExisting, created: false };
    }
  }

  throw new Error(`Unable to create lookup entry for ${table}: ${name}`);
}

async function ensurePlantSkuLookups(
  businessId: string,
  input: {
    source: string;
    genus: string;
    cultivar: string;
    locationCode?: string | null;
  }
) {
  const source = await ensureLookupEntry(businessId, "plantSource", input.source);
  const genus = await ensureLookupEntry(businessId, "genus", input.genus);
  const cultivar = await ensureLookupEntry(businessId, "cultivar", input.cultivar, {
    parentCode: genus.code,
  });
  const plantId = input.locationCode
    ? await ensureLookupEntry(businessId, "plantId", input.locationCode, {
        matchCode: true,
        maxLength: 10,
        preserveCodeLike: true,
      })
    : null;
  const sku = buildPlantSku(
    source.code,
    genus.code,
    cultivar.code,
    plantId?.code ?? ""
  );

  return {
    sourceName: source.name,
    genusName: genus.name,
    cultivarName: cultivar.name,
    locationCode: plantId?.code ?? null,
    sku,
    createdLookup: source.created || genus.created || cultivar.created || Boolean(plantId?.created),
  };
}

async function ensureProductSkuLookups(
  businessId: string,
  input: {
    source: string;
    category: string;
    size?: string | null;
    style?: string | null;
    purchaseNumber?: string | null;
  }
) {
  const source = await ensureLookupEntry(businessId, "productSource", input.source);
  const category = await ensureLookupEntry(
    businessId,
    "productCategory",
    input.category
  );
  const size = input.size
    ? await ensureLookupEntry(businessId, "productSize", input.size, {
        matchCode: true,
        maxLength: 10,
        preserveNumericCodeLike: true,
      })
    : null;
  const style = input.style
    ? await ensureLookupEntry(businessId, "productStyle", input.style)
    : null;
  const sku = buildProductSku(
    source.code,
    category.code,
    size?.code ?? "",
    style?.code ?? "",
    input.purchaseNumber ?? ""
  );

  return {
    sourceName: source.name,
    categoryName: category.name,
    sizeCode: size?.code ?? null,
    styleName: style?.name ?? null,
    sku,
    createdLookup:
      source.created || category.created || Boolean(size?.created) || Boolean(style?.created),
  };
}

export async function createSalesEntry(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const sku = formStr(formData, "sku");
  if (!sku) return { ok: false, error: "SKU is required" };

  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const salePriceCents = formCents(formData, "salePrice");
  const costCents = formCents(formData, "cost");
  const derived = await calculateSalesDerived(
    businessId,
    qty,
    salePriceCents,
    costCents
  );

  const entry = await db.salesEntry.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      sku,
      itemName: formStr(formData, "itemName") || null,
      qty,
      salePriceCents,
      costCents,
      totalSaleCents: derived.totalSaleCents,
      profitCents: derived.profitCents,
      marginPct: derived.marginPct,
      channel: formStr(formData, "channel") || null,
      paymentMethod: formStr(formData, "paymentMethod") || null,
      cardLast4: formStr(formData, "cardLast4") || null,
      notes: formStr(formData, "notes") || null,
    },
  });

  await upsertProductFromRow(businessId, sku, {
    productName: formStr(formData, "itemName") || null,
    defaultCostCents: costCents,
    defaultSalePriceCents: salePriceCents,
  });
  await syncProductToSales(businessId, sku, businessSlug);

  revalidatePath(`/app/${businessSlug}/sales`);
  return { ok: true, id: entry.id };
}

export async function createPlantIntake(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const submittedSku = formStr(formData, "sku");
  const skuWasManual = formStr(formData, "skuWasManual") === "1";
  const source = formStr(formData, "source");
  const genus = formStr(formData, "genus");
  const cultivar = formStr(formData, "cultivar");
  if (!source || !genus || !cultivar)
    return { ok: false, error: "Source, Genus, and Cultivar are required" };

  const lookupParts = await ensurePlantSkuLookups(businessId, {
    source,
    genus,
    cultivar,
    locationCode: formStr(formData, "locationCode") || null,
  });
  const sku = skuWasManual ? submittedSku : lookupParts.sku;
  if (!sku) return { ok: false, error: "SKU is required" };

  await db.plantIntake.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      source: lookupParts.sourceName,
      genus: lookupParts.genusName,
      cultivar: lookupParts.cultivarName,
      sku,
      locationCode: lookupParts.locationCode,
      qty: Math.max(1, Math.floor(Number(formData.get("qty")) || 1)),
      costCents: formCents(formData, "cost"),
      msrpCents: formCents(formData, "msrp"),
      potType: formStr(formData, "potType") || null,
      paymentMethod: formStr(formData, "paymentMethod") || null,
      cardLast4: formStr(formData, "cardLast4") || null,
      location: formStr(formData, "location") || null,
      status: formStr(formData, "status") || null,
    },
  });

  revalidatePath(`/app/${businessSlug}/plant-intake`);
  if (lookupParts.createdLookup) {
    revalidatePath(`/app/${businessSlug}/settings/lookups`);
  }
  return { ok: true };
}

export async function createProductIntake(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const submittedSku = formStr(formData, "sku");
  const skuWasManual = formStr(formData, "skuWasManual") === "1";
  const source = formStr(formData, "source");
  const category = formStr(formData, "category");
  if (!source || !category)
    return { ok: false, error: "Source and Category are required" };

  const lookupParts = await ensureProductSkuLookups(businessId, {
    source,
    category,
    size: formStr(formData, "size") || null,
    style: formStr(formData, "style") || null,
    purchaseNumber: formStr(formData, "purchaseNumber") || null,
  });
  const sku = skuWasManual ? submittedSku : lookupParts.sku;
  if (!sku) return { ok: false, error: "SKU is required" };

  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const totalCostCents = formCents(formData, "totalCost");
  const { unitCostCents } = await calculateProductIntakeDerived(
    businessId,
    totalCostCents,
    qty
  );

  await db.productIntake.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      sku,
      vendor: formStr(formData, "vendor") || null,
      source: lookupParts.sourceName,
      category: lookupParts.categoryName,
      size: lookupParts.sizeCode,
      style: lookupParts.styleName,
      purchaseNumber: formStr(formData, "purchaseNumber") || null,
      qty,
      totalCostCents,
      unitCostCents,
      paymentMethod: formStr(formData, "paymentMethod") || null,
      cardLast4: formStr(formData, "cardLast4") || null,
      invoiceNumber: formStr(formData, "invoiceNumber") || null,
      notes: formStr(formData, "notes") || null,
    },
  });

  revalidatePath(`/app/${businessSlug}/product-intake`);
  if (lookupParts.createdLookup) {
    revalidatePath(`/app/${businessSlug}/settings/lookups`);
  }
  return { ok: true };
}

export async function createOverheadExpense(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const subTotalCents = formCents(formData, "subTotal");
  const shippingCents = formCents(formData, "shipping");
  const discountCents = formCents(formData, "discount");
  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const { unitCostCents, totalCents } = await calculateOverheadDerived(
    businessId,
    subTotalCents,
    shippingCents,
    discountCents,
    qty
  );

  await db.overheadExpense.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      vendor: formStr(formData, "vendor") || null,
      brand: formStr(formData, "brand") || null,
      category: formStr(formData, "category") || null,
      description: formStr(formData, "description") || null,
      qty,
      subTotalCents,
      shippingCents,
      discountCents,
      unitCostCents,
      totalCents,
      paymentMethod: formStr(formData, "paymentMethod") || null,
      cardLast4: formStr(formData, "cardLast4") || null,
      invoiceNumber: formStr(formData, "invoiceNumber") || null,
      notes: formStr(formData, "notes") || null,
    },
  });

  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  return { ok: true };
}

export async function createTransplantLog(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const originalSku = formStr(formData, "originalSku") || null;
  const action = formStr(formData, "action") || null;
  let costCents = formCents(formData, "cost");

  if (
    costCents === 0 &&
    originalSku &&
    action &&
    action.toLowerCase().includes("division")
  ) {
    const [originalPlant, existingDivisions] = await Promise.all([
      db.plantIntake.findFirst({
        where: { businessId, sku: originalSku },
        select: { costCents: true },
        orderBy: { createdAt: "desc" },
      }),
      db.transplantLog.count({
        where: { businessId, originalSku, action: { contains: "ivision" } },
      }),
    ]);
    if (originalPlant && originalPlant.costCents > 0) {
      const totalParts = existingDivisions + 2;
      costCents = (
        await calculateDivisionCost(businessId, originalPlant.costCents, totalParts)
      ).costCents;
    }
  }

  await db.transplantLog.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      originalSku,
      action,
      media: formStr(formData, "media") || null,
      fromPot: formStr(formData, "fromPot") || null,
      toPot: formStr(formData, "toPot") || null,
      idCode: formStr(formData, "idCode") || null,
      divisionSku: formStr(formData, "divisionSku") || null,
      costCents,
      potColor: formStr(formData, "potColor") || null,
      notes: formStr(formData, "notes") || null,
    },
  });

  revalidatePath(`/app/${businessSlug}/transplant-log`);
  return { ok: true };
}

export async function createTreatmentTracking(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const sku = formStr(formData, "sku");
  if (!sku) return { ok: false, error: "SKU is required" };

  await db.treatmentTracking.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      sku,
      target: formStr(formData, "target") || null,
      product: formStr(formData, "product") || null,
      activeIngredient: formStr(formData, "activeIngredient") || null,
      epaNumber: formStr(formData, "epaNumber") || null,
      rate: formStr(formData, "rate") || null,
      potSize: formStr(formData, "potSize") || null,
      method: formStr(formData, "method") || null,
      initials: formStr(formData, "initials") || null,
      nextEarliest: formDate(formData, "nextEarliest"),
      nextLatest: formDate(formData, "nextLatest"),
    },
  });

  revalidatePath(`/app/${businessSlug}/treatment-tracking`);
  return { ok: true };
}

export async function createFertilizerLog(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const date = formDate(formData, "date");
  const product = formStr(formData, "product") || null;
  let nextEarliest = formDate(formData, "nextEarliest");
  let nextLatest = formDate(formData, "nextLatest");

  if (!nextEarliest && !nextLatest && date && product) {
    const { calcNextApplicationDates } = await import("@/lib/fertilizer-key");
    const calc = calcNextApplicationDates(date, product);
    if (calc) {
      nextEarliest = calc.nextEarliest;
      nextLatest = calc.nextLatest;
    }
  }

  await db.fertilizerLog.create({
    data: {
      businessId,
      date,
      plantSku: formStr(formData, "plantSku") || null,
      potSku: formStr(formData, "potSku") || null,
      product,
      method: formStr(formData, "method") || null,
      rate: formStr(formData, "rate") || null,
      unit: formStr(formData, "unit") || null,
      nextEarliest,
      nextLatest,
      notes: formStr(formData, "notes") || null,
    },
  });

  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  return { ok: true };
}

export type PlantIntakeUpdate = {
  date?: string | null;
  source?: string;
  genus?: string;
  cultivar?: string;
  locationCode?: string | null;
  sku?: string;
  qty?: number;
  costCents?: number;
  msrpCents?: number;
  potType?: string | null;
  paymentMethod?: string | null;
  cardLast4?: string | null;
  location?: string | null;
  status?: string | null;
};

export async function updatePlantIntake(
  id: string,
  businessSlug: string,
  data: PlantIntakeUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.plantIntake.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const skuLookupChanged =
    data.source !== undefined ||
    data.genus !== undefined ||
    data.cultivar !== undefined ||
    data.locationCode !== undefined;
  let lookupCreated = false;
  const updateData: Record<string, string | number | Date | null> = {};
  if (dateValue !== undefined) updateData.date = dateValue;
  if (skuLookupChanged) {
    const nextSource = data.source ?? existing.source;
    const nextGenus = data.genus ?? existing.genus;
    const nextCultivar = data.cultivar ?? existing.cultivar;
    const nextLocationCode =
      data.locationCode !== undefined ? data.locationCode : existing.locationCode;

    if (nextSource && nextGenus && nextCultivar) {
      const lookupParts = await ensurePlantSkuLookups(businessId, {
        source: nextSource,
        genus: nextGenus,
        cultivar: nextCultivar,
        locationCode: nextLocationCode,
      });
      updateData.source = lookupParts.sourceName;
      updateData.genus = lookupParts.genusName;
      updateData.cultivar = lookupParts.cultivarName;
      updateData.locationCode = lookupParts.locationCode;
      if (data.sku === undefined) updateData.sku = lookupParts.sku;
      lookupCreated = lookupParts.createdLookup;
    } else {
      if (data.source !== undefined) updateData.source = data.source;
      if (data.genus !== undefined) updateData.genus = data.genus;
      if (data.cultivar !== undefined) updateData.cultivar = data.cultivar;
      if (data.locationCode !== undefined) updateData.locationCode = data.locationCode;
    }
  }
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.qty !== undefined) updateData.qty = data.qty;
  if (data.costCents !== undefined) updateData.costCents = data.costCents;
  if (data.msrpCents !== undefined) updateData.msrpCents = data.msrpCents;
  if (data.potType !== undefined) updateData.potType = data.potType;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.cardLast4 !== undefined) updateData.cardLast4 = data.cardLast4;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.status !== undefined) updateData.status = data.status;

  await db.plantIntake.update({
    where: { id },
    data: updateData,
  });
  revalidatePath(`/app/${businessSlug}/plant-intake`);
  if (lookupCreated) revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export type ProductIntakeUpdate = {
  date?: string | null;
  vendor?: string | null;
  source?: string | null;
  category?: string | null;
  size?: string | null;
  style?: string | null;
  purchaseNumber?: string | null;
  qty?: number;
  sku?: string;
  totalCostCents?: number;
  unitCostCents?: number;
  paymentMethod?: string | null;
  cardLast4?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
};

export async function updateProductIntake(
  id: string,
  businessSlug: string,
  data: ProductIntakeUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.productIntake.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const qty = data.qty ?? existing.qty;
  const totalCents = data.totalCostCents ?? existing.totalCostCents;
  const { unitCostCents } = await calculateProductIntakeDerived(
    businessId,
    totalCents,
    qty
  );

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const skuLookupChanged =
    data.source !== undefined ||
    data.category !== undefined ||
    data.size !== undefined ||
    data.style !== undefined ||
    data.purchaseNumber !== undefined;
  let lookupCreated = false;
  const updateData: Record<string, string | number | Date | null> = {
    unitCostCents,
  };
  if (dateValue !== undefined) updateData.date = dateValue;
  if (skuLookupChanged) {
    const nextSource = data.source !== undefined ? data.source : existing.source;
    const nextCategory =
      data.category !== undefined ? data.category : existing.category;
    const nextSize = data.size !== undefined ? data.size : existing.size;
    const nextStyle = data.style !== undefined ? data.style : existing.style;
    const nextPurchaseNumber =
      data.purchaseNumber !== undefined
        ? data.purchaseNumber
        : existing.purchaseNumber;

    if (nextSource && nextCategory) {
      const lookupParts = await ensureProductSkuLookups(businessId, {
        source: nextSource,
        category: nextCategory,
        size: nextSize,
        style: nextStyle,
        purchaseNumber: nextPurchaseNumber,
      });
      updateData.source = lookupParts.sourceName;
      updateData.category = lookupParts.categoryName;
      updateData.size = lookupParts.sizeCode;
      updateData.style = lookupParts.styleName;
      updateData.purchaseNumber = nextPurchaseNumber;
      if (data.sku === undefined) updateData.sku = lookupParts.sku;
      lookupCreated = lookupParts.createdLookup;
    } else {
      if (data.source !== undefined) updateData.source = data.source;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.size !== undefined) updateData.size = data.size;
      if (data.style !== undefined) updateData.style = data.style;
      if (data.purchaseNumber !== undefined)
        updateData.purchaseNumber = data.purchaseNumber;
    }
  }
  if (data.vendor !== undefined) updateData.vendor = data.vendor;
  if (data.qty !== undefined) updateData.qty = data.qty;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.totalCostCents !== undefined)
    updateData.totalCostCents = data.totalCostCents;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.cardLast4 !== undefined) updateData.cardLast4 = data.cardLast4;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await db.productIntake.update({
    where: { id },
    data: updateData,
  });
  revalidatePath(`/app/${businessSlug}/product-intake`);
  if (lookupCreated) revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export type TransplantLogUpdate = {
  date?: string | null;
  originalSku?: string | null;
  action?: string | null;
  media?: string | null;
  fromPot?: string | null;
  toPot?: string | null;
  idCode?: string | null;
  divisionSku?: string | null;
  costCents?: number;
  potColor?: string | null;
  notes?: string | null;
};

export async function updateTransplantLog(
  id: string,
  businessSlug: string,
  data: TransplantLogUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.transplantLog.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  await db.transplantLog.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.originalSku !== undefined && { originalSku: data.originalSku }),
      ...(data.action !== undefined && { action: data.action }),
      ...(data.media !== undefined && { media: data.media }),
      ...(data.fromPot !== undefined && { fromPot: data.fromPot }),
      ...(data.toPot !== undefined && { toPot: data.toPot }),
      ...(data.idCode !== undefined && { idCode: data.idCode }),
      ...(data.divisionSku !== undefined && { divisionSku: data.divisionSku }),
      ...(data.costCents !== undefined && { costCents: data.costCents }),
      ...(data.potColor !== undefined && { potColor: data.potColor }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  revalidatePath(`/app/${businessSlug}/transplant-log`);
  return { ok: true };
}

export type TreatmentTrackingUpdate = {
  date?: string | null;
  sku?: string;
  target?: string | null;
  product?: string | null;
  activeIngredient?: string | null;
  epaNumber?: string | null;
  rate?: string | null;
  potSize?: string | null;
  method?: string | null;
  initials?: string | null;
  nextEarliest?: string | null;
  nextLatest?: string | null;
};

export async function updateTreatmentTracking(
  id: string,
  businessSlug: string,
  data: TreatmentTrackingUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.treatmentTracking.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const nextEarliestValue =
    data.nextEarliest !== undefined
      ? data.nextEarliest === null || data.nextEarliest === ""
        ? null
        : new Date(data.nextEarliest)
      : undefined;
  const nextLatestValue =
    data.nextLatest !== undefined
      ? data.nextLatest === null || data.nextLatest === ""
        ? null
        : new Date(data.nextLatest)
      : undefined;

  await db.treatmentTracking.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.target !== undefined && { target: data.target }),
      ...(data.product !== undefined && { product: data.product }),
      ...(data.activeIngredient !== undefined && { activeIngredient: data.activeIngredient }),
      ...(data.epaNumber !== undefined && { epaNumber: data.epaNumber }),
      ...(data.rate !== undefined && { rate: data.rate }),
      ...(data.potSize !== undefined && { potSize: data.potSize }),
      ...(data.method !== undefined && { method: data.method }),
      ...(data.initials !== undefined && { initials: data.initials }),
      ...(nextEarliestValue !== undefined && { nextEarliest: nextEarliestValue }),
      ...(nextLatestValue !== undefined && { nextLatest: nextLatestValue }),
    },
  });
  revalidatePath(`/app/${businessSlug}/treatment-tracking`);
  return { ok: true };
}

export type OverheadExpenseUpdate = {
  date?: string | null;
  vendor?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  qty?: number;
  subTotalCents?: number;
  shippingCents?: number;
  discountCents?: number;
  paymentMethod?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
};

export async function updateOverheadExpense(
  id: string,
  businessSlug: string,
  data: OverheadExpenseUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.overheadExpense.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const subTotalCents = data.subTotalCents ?? existing.subTotalCents;
  const shippingCents = data.shippingCents ?? existing.shippingCents;
  const discountCents = data.discountCents ?? existing.discountCents;
  const qty = data.qty ?? existing.qty;
  const { unitCostCents, totalCents } = await calculateOverheadDerived(
    businessId,
    subTotalCents,
    shippingCents,
    discountCents,
    qty
  );

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  await db.overheadExpense.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.vendor !== undefined && { vendor: data.vendor }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.qty !== undefined && { qty: data.qty }),
      ...(data.subTotalCents !== undefined && { subTotalCents: data.subTotalCents }),
      ...(data.shippingCents !== undefined && { shippingCents: data.shippingCents }),
      ...(data.discountCents !== undefined && { discountCents: data.discountCents }),
      totalCents,
      unitCostCents,
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  return { ok: true };
}

export type FertilizerLogUpdate = {
  date?: string | null;
  plantSku?: string | null;
  potSku?: string | null;
  product?: string | null;
  method?: string | null;
  rate?: string | null;
  unit?: string | null;
  nextEarliest?: string | null;
  nextLatest?: string | null;
  notes?: string | null;
};

export async function updateFertilizerLog(
  id: string,
  businessSlug: string,
  data: FertilizerLogUpdate
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.fertilizerLog.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;
  const nextEarliestValue =
    data.nextEarliest !== undefined
      ? data.nextEarliest === null || data.nextEarliest === ""
        ? null
        : new Date(data.nextEarliest)
      : undefined;
  const nextLatestValue =
    data.nextLatest !== undefined
      ? data.nextLatest === null || data.nextLatest === ""
        ? null
        : new Date(data.nextLatest)
      : undefined;

  await db.fertilizerLog.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.plantSku !== undefined && { plantSku: data.plantSku }),
      ...(data.potSku !== undefined && { potSku: data.potSku }),
      ...(data.product !== undefined && { product: data.product }),
      ...(data.method !== undefined && { method: data.method }),
      ...(data.rate !== undefined && { rate: data.rate }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(nextEarliestValue !== undefined && { nextEarliest: nextEarliestValue }),
      ...(nextLatestValue !== undefined && { nextLatest: nextLatestValue }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  return { ok: true };
}

export async function deleteSalesEntry(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.salesEntry.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.salesEntry.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/sales`);
  return { ok: true };
}

export async function deletePlantIntake(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.plantIntake.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.plantIntake.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/plant-intake`);
  return { ok: true };
}

export async function deleteProductIntake(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.productIntake.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.productIntake.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/product-intake`);
  return { ok: true };
}

export async function deleteOverheadExpense(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.overheadExpense.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.overheadExpense.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  return { ok: true };
}

export async function deleteTransplantLog(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.transplantLog.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.transplantLog.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/transplant-log`);
  return { ok: true };
}

export async function deleteFertilizerLog(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.fertilizerLog.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.fertilizerLog.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  return { ok: true };
}

export async function deleteTreatmentTracking(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  const existing = await db.treatmentTracking.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };
  await db.treatmentTracking.delete({ where: { id } });
  revalidatePath(`/app/${businessSlug}/treatment-tracking`);
  return { ok: true };
}
