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

  const sku = formStr(formData, "sku");
  const source = formStr(formData, "source");
  const genus = formStr(formData, "genus");
  const cultivar = formStr(formData, "cultivar");
  if (!sku || !source || !genus || !cultivar)
    return { ok: false, error: "SKU, Source, Genus, and Cultivar are required" };

  await db.plantIntake.create({
    data: {
      businessId,
      date: formDate(formData, "date"),
      source,
      genus,
      cultivar,
      sku,
      locationCode: formStr(formData, "locationCode") || null,
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
  return { ok: true };
}

export async function createProductIntake(businessSlug: string, formData: FormData) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const sku = formStr(formData, "sku");
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
      source: formStr(formData, "source") || null,
      category: formStr(formData, "category") || null,
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

  // Auto-calculate division cost: original plant cost / total divisions for that SKU
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
      // +2: the original plant itself + the new division being created
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

  // Auto-calculate next application dates if not manually provided
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

// --- Update actions for inline editing ---

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

  await db.plantIntake.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.genus !== undefined && { genus: data.genus }),
      ...(data.cultivar !== undefined && { cultivar: data.cultivar }),
      ...(data.locationCode !== undefined && { locationCode: data.locationCode }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.qty !== undefined && { qty: data.qty }),
      ...(data.costCents !== undefined && { costCents: data.costCents }),
      ...(data.msrpCents !== undefined && { msrpCents: data.msrpCents }),
      ...(data.potType !== undefined && { potType: data.potType }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.cardLast4 !== undefined && { cardLast4: data.cardLast4 }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
  revalidatePath(`/app/${businessSlug}/plant-intake`);
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

  await db.productIntake.update({
    where: { id },
    data: {
      ...(dateValue !== undefined && { date: dateValue }),
      ...(data.vendor !== undefined && { vendor: data.vendor }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.size !== undefined && { size: data.size }),
      ...(data.style !== undefined && { style: data.style }),
      ...(data.purchaseNumber !== undefined && { purchaseNumber: data.purchaseNumber }),
      ...(data.qty !== undefined && { qty: data.qty }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.totalCostCents !== undefined && { totalCostCents: data.totalCostCents }),
      unitCostCents,
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  revalidatePath(`/app/${businessSlug}/product-intake`);
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

// ── Delete actions ────────────────────────────────────────────────

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
