"use server";

import { withTenantRlsTransaction } from "@/lib/db";
import { requireBusinessMembership } from "@/lib/authz";
import type { BusinessContext } from "@/lib/business-context";
import {
  calculateDivisionCost,
} from "@/lib/app-logic-engine";
import {
  loadAuditedDetailedAppLogicRowPipeline,
  runDetailedAppLogicRowPipeline,
  runAppLogicRowPipeline,
} from "@/lib/app-logic-row-service";
import {
  dateFieldsFromAppLogicScope,
  dateFieldsToAppLogicScope,
} from "@/lib/app-logic-row-mapping";
import type { DateAppLogicFields } from "@/lib/app-logic-row-mapping";
import { executeGovernedAppLogicActions } from "@/lib/app-logic-action-broker";
import { appLogicFailureMessage } from "@/lib/app-logic-audit";
import { generateSku } from "@/lib/plant-sku-service";
import { createFertilizerLogRepository } from "@/lib/repositories/fertilizer-log";
import {
  createPlantIntakeRepository,
  type TenantPlantIntakeUpdateInput,
} from "@/lib/repositories/plant-intake";
import { createOverheadExpenseRepository } from "@/lib/repositories/overhead-expense";
import {
  createProductIntakeRepository,
  type TenantProductIntakeUpdateInput,
} from "@/lib/repositories/product-intake";
import {
  createProductRepository,
  type TenantProductUpdateInput,
} from "@/lib/repositories/product";
import { createSalesRepository } from "@/lib/repositories/sales";
import { createTransplantLogRepository } from "@/lib/repositories/transplant-log";
import { createTreatmentTrackingRepository } from "@/lib/repositories/treatment-tracking";
import { revalidatePath } from "next/cache";

type ProductMasterFields = {
  productName?: string | null;
  defaultCostCents?: number;
  defaultSalePriceCents?: number;
};

async function runAppLogicSafely<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, value: await operation() };
  } catch (error) {
    return { ok: false as const, error: appLogicFailureMessage(error) };
  }
}

async function runDateAppLogicSafely(
  context: BusinessContext,
  module: "treatmentTracking" | "fertilizerLog",
  fields: DateAppLogicFields,
  sourceRowId?: string
) {
  return runAppLogicSafely(async () => {
    const execution = await runDetailedAppLogicRowPipeline(
      context,
      module,
      "INTERACTIVE",
      dateFieldsToAppLogicScope(fields),
      { sourceRowId }
    );
    return dateFieldsFromAppLogicScope(execution.scope);
  });
}

async function upsertProductFromRow(
  context: BusinessContext,
  sku: string,
  fields: ProductMasterFields
) {
  const products = createProductRepository(context);
  const updatePayload: TenantProductUpdateInput = {};
  if (fields.productName !== undefined) updatePayload.productName = fields.productName;
  if (fields.defaultCostCents !== undefined)
    updatePayload.defaultCostCents = fields.defaultCostCents;
  if (fields.defaultSalePriceCents !== undefined)
    updatePayload.defaultSalePriceCents = fields.defaultSalePriceCents;

  await products.upsertBySku(
    sku,
    {
      productName: fields.productName ?? null,
      defaultCostCents: fields.defaultCostCents ?? 0,
      defaultSalePriceCents: fields.defaultSalePriceCents ?? 0,
    },
    updatePayload
  );
}

async function syncProductToSales(
  context: BusinessContext,
  sku: string,
  businessSlug: string
) {
  const sales = createSalesRepository(context);
  const products = createProductRepository(context);
  const product = await products.findBySku(sku);
  if (!product) return;

  const productName = product.productName ?? null;
  const defaultCostCents = product.defaultCostCents;
  const defaultSalePriceCents = product.defaultSalePriceCents;

  const salesRows = await sales.listForSkuSync(sku);
  const calculateSales = await loadAuditedDetailedAppLogicRowPipeline(
    context,
    "sales",
    "INTERACTIVE"
  );

  for (const row of salesRows) {
    const execution = calculateSales.run({
      qty: row.qty,
      salePriceCents: defaultSalePriceCents,
      costCents: defaultCostCents,
    }, row.id);
    const derived = execution.scope;
    await sales.updateById(row.id, {
      itemName: productName,
      qty: Math.round(derived.qty),
      costCents: defaultCostCents,
      salePriceCents: defaultSalePriceCents,
      totalSaleCents: derived.totalSaleCents,
      profitCents: derived.profitCents,
      marginPct: derived.marginPct,
    });
    await executeGovernedAppLogicActions(
      context,
      {
        module: "sales",
        rowId: row.id,
        sku,
        productName,
        defaultCostCents,
        defaultSalePriceCents,
      },
      execution.actions
    );
  }
  await calculateSales.flush();

  revalidateSalesPaths(businessSlug);
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);

  const existing = await sales.findById(id);
  if (!existing) return { ok: false, error: "Not found" };

  const qty = data.qty ?? existing.qty;
  const salePriceCents = data.salePriceCents ?? existing.salePriceCents;
  const costCents = data.costCents ?? existing.costCents;
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "sales",
      "INTERACTIVE",
      { qty, salePriceCents, costCents },
      { sourceRowId: id }
    )
  );
  if (!logicResult.ok) return logicResult;
  const execution = logicResult.value;
  const derived = execution.scope;

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const updated = await sales.updateById(id, {
    ...(dateValue !== undefined && { date: dateValue }),
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.itemName !== undefined && { itemName: data.itemName }),
    qty: Math.round(derived.qty),
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
  });
  if (!updated) return { ok: false, error: "Not found" };

  const skuAfter = data.sku ?? existing.sku;
  const itemNameAfter = data.itemName ?? existing.itemName;
  const costCentsAfter = data.costCents ?? existing.costCents;
  const salePriceCentsAfter = data.salePriceCents ?? existing.salePriceCents;
  await executeGovernedAppLogicActions(
    businessContext,
    {
      module: "sales",
      rowId: id,
      sku: skuAfter,
      productName: itemNameAfter,
      defaultCostCents: costCentsAfter,
      defaultSalePriceCents: salePriceCentsAfter,
    },
    execution.actions
  );
  await upsertProductFromRow(businessContext, skuAfter, {
    productName: itemNameAfter,
    defaultCostCents: costCentsAfter,
    defaultSalePriceCents: salePriceCentsAfter,
  });
  await syncProductToSales(businessContext, skuAfter, businessSlug);

  revalidateSalesPaths(businessSlug);
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

function revalidateDerivedInventoryPaths(businessSlug: string) {
  const base = `/app/${businessSlug}`;
  revalidatePath(base);
  revalidatePath(`${base}/plant-inventory`);
  revalidatePath(`${base}/product-inventory`);
  revalidatePath(`${base}/sku-scanner`);
}

function revalidateSalesPaths(businessSlug: string) {
  revalidatePath(`/app/${businessSlug}/sales`);
  revalidateDerivedInventoryPaths(businessSlug);
}

function revalidatePlantIntakePaths(businessSlug: string) {
  revalidatePath(`/app/${businessSlug}/plant-intake`);
  revalidateDerivedInventoryPaths(businessSlug);
}

function revalidateProductIntakePaths(businessSlug: string) {
  revalidatePath(`/app/${businessSlug}/product-intake`);
  revalidateDerivedInventoryPaths(businessSlug);
}

function revalidateTransplantPaths(businessSlug: string) {
  revalidatePath(`/app/${businessSlug}/transplant-log`);
  revalidateDerivedInventoryPaths(businessSlug);
}

export async function createSalesEntry(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);

  const sku = formStr(formData, "sku");
  if (!sku) return { ok: false, error: "SKU is required" };

  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const salePriceCents = formCents(formData, "salePrice");
  const costCents = formCents(formData, "cost");
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "sales",
      "INTERACTIVE",
      { qty, salePriceCents, costCents }
    )
  );
  if (!logicResult.ok) return logicResult;
  const execution = logicResult.value;
  const derived = execution.scope;
  const itemName = formStr(formData, "itemName") || null;

  const entry = await sales.create({
    date: formDate(formData, "date"),
    sku,
    itemName,
    qty: Math.round(derived.qty),
    salePriceCents,
    costCents,
    totalSaleCents: derived.totalSaleCents,
    profitCents: derived.profitCents,
    marginPct: derived.marginPct,
    channel: formStr(formData, "channel") || null,
    paymentMethod: formStr(formData, "paymentMethod") || null,
    cardLast4: formStr(formData, "cardLast4") || null,
    notes: formStr(formData, "notes") || null,
  });

  await executeGovernedAppLogicActions(
    businessContext,
    {
      module: "sales",
      rowId: entry.id,
      sku,
      productName: itemName,
      defaultCostCents: costCents,
      defaultSalePriceCents: salePriceCents,
    },
    execution.actions
  );

  await upsertProductFromRow(businessContext, sku, {
    productName: itemName,
    defaultCostCents: costCents,
    defaultSalePriceCents: salePriceCents,
  });
  await syncProductToSales(businessContext, sku, businessSlug);

  revalidatePath(`/app/${businessSlug}/sales`);
  return { ok: true, id: entry.id };
}

export async function createPlantIntake(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);

  const source = formStr(formData, "source");
  const genus = formStr(formData, "genus");
  const cultivar = formStr(formData, "cultivar");
  if (!genus) return { ok: false, error: "Plant name is required" };
  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const costCents = formCents(formData, "cost");
  const msrpCents = formCents(formData, "msrp");
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "plantIntake",
      "INTERACTIVE",
      { qty, costCents, msrpCents }
    )
  );
  if (!logicResult.ok) return logicResult;
  const plantExecution = logicResult.value;
  const plantLogic = plantExecution.scope;
  const calculatedQty = Math.round(plantLogic.qty);
  const calculatedCostCents = Math.round(plantLogic.costCents);
  const calculatedMsrpCents = Math.round(plantLogic.msrpCents);

  try {
    await withTenantRlsTransaction(businessContext, async (tx) => {
      const plantIntakes = createPlantIntakeRepository(businessContext, tx);
      const products = createProductRepository(businessContext, tx);
      const generated = await generateSku(tx, businessContext, {
        plantName: genus,
        categoryName: source || null,
        varietyName: cultivar || null,
        suffix: formStr(formData, "locationCode") || null,
      });
      await products.create({
        sku: generated.sku,
        productName: [genus, cultivar].filter(Boolean).join(" ") || genus,
        defaultCostCents: calculatedCostCents,
        defaultSalePriceCents: calculatedMsrpCents,
      });

      const intake = await plantIntakes.create({
        date: formDate(formData, "date"),
        source,
        genus,
        cultivar,
        sku: generated.sku,
        locationCode: formStr(formData, "locationCode") || null,
        qty: calculatedQty,
        costCents: calculatedCostCents,
        msrpCents: calculatedMsrpCents,
        potType: formStr(formData, "potType") || null,
        paymentMethod: formStr(formData, "paymentMethod") || null,
        cardLast4: formStr(formData, "cardLast4") || null,
        location: formStr(formData, "location") || null,
        status: formStr(formData, "status") || null,
      });
      await executeGovernedAppLogicActions(
        businessContext,
        {
          module: "plantIntake",
          rowId: intake.id,
          sku: generated.sku,
          productName: [genus, cultivar].filter(Boolean).join(" ") || genus,
          defaultCostCents: calculatedCostCents,
          defaultSalePriceCents: calculatedMsrpCents,
        },
        plantExecution.actions,
        tx
      );
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "Unable to create a unique SKU. Please retry." };
    }
    throw error;
  }

  revalidatePlantIntakePaths(businessSlug);
  return { ok: true };
}

export async function createProductIntake(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);

  const source = formStr(formData, "source");
  const category = formStr(formData, "category");
  if (!source || !category)
    return { ok: false, error: "Source and Category are required" };

  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const totalCostCents = formCents(formData, "totalCost");
  const msrpCents = formCents(formData, "msrp");
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "productIntake",
      "INTERACTIVE",
      { totalCostCents, qty }
    )
  );
  if (!logicResult.ok) return logicResult;
  const productExecution = logicResult.value;
  const productLogic = productExecution.scope;
  const unitCostCents = Math.round(productLogic.unitCostCents);

  try {
    await withTenantRlsTransaction(businessContext, async (tx) => {
      const products = createProductRepository(businessContext, tx);
      const productIntakes = createProductIntakeRepository(businessContext, tx);
      const size = formStr(formData, "size");
      const style = formStr(formData, "style");
      const generated = await generateSku(tx, businessContext, {
        plantName: source,
        categoryName: category,
        varietyName: [size, style].filter(Boolean).join(" ") || null,
        suffix: formStr(formData, "purchaseNumber") || null,
      });
      await products.create({
        sku: generated.sku,
        productName: category,
        defaultCostCents: unitCostCents,
        defaultSalePriceCents: msrpCents,
      });

      const intake = await productIntakes.create({
        date: formDate(formData, "date"),
        sku: generated.sku,
        vendor: formStr(formData, "vendor") || null,
        source,
        category,
        size: size || null,
        style: style || null,
        purchaseNumber: formStr(formData, "purchaseNumber") || null,
        qty,
        totalCostCents,
        unitCostCents,
        paymentMethod: formStr(formData, "paymentMethod") || null,
        cardLast4: formStr(formData, "cardLast4") || null,
        invoiceNumber: formStr(formData, "invoiceNumber") || null,
        notes: formStr(formData, "notes") || null,
      });
      await executeGovernedAppLogicActions(
        businessContext,
        {
          module: "productIntake",
          rowId: intake.id,
          sku: generated.sku,
          productName: category,
          defaultCostCents: unitCostCents,
          defaultSalePriceCents: msrpCents,
        },
        productExecution.actions,
        tx
      );
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "Unable to create a unique SKU. Please retry." };
    }
    throw error;
  }

  revalidateProductIntakePaths(businessSlug);
  return { ok: true };
}

export async function createOverheadExpense(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);

  const subTotalCents = formCents(formData, "subTotal");
  const shippingCents = formCents(formData, "shipping");
  const discountCents = formCents(formData, "discount");
  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const logicResult = await runAppLogicSafely(() =>
    runAppLogicRowPipeline(
      businessContext,
      "overheadExpenses",
      "INTERACTIVE",
      { subTotalCents, shippingCents, discountCents, qty }
    )
  );
  if (!logicResult.ok) return logicResult;
  const overheadLogic = logicResult.value;
  const unitCostCents = Math.round(overheadLogic.unitCostCents);
  const totalCents = Math.round(overheadLogic.totalCents);

  await overheadExpenses.create({
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
  });

  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  return { ok: true };
}

export async function createTransplantLog(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);
  const transplants = createTransplantLogRepository(businessContext);

  const originalSku = formStr(formData, "originalSku") || null;
  const action = formStr(formData, "action") || null;
  const latestForOriginalSku = originalSku
    ? await transplants.findLatestForOriginalSku(originalSku)
    : null;
  const fromPot = latestForOriginalSku?.fromPot ?? (formStr(formData, "fromPot") || null);
  let costCents = latestForOriginalSku?.costCents ?? formCents(formData, "cost");

  if (
    costCents === 0 &&
    originalSku &&
    action &&
    action.toLowerCase().includes("division")
  ) {
    const [originalPlant, existingDivisions] = await Promise.all([
      plantIntakes.findLatestBySku(originalSku),
      transplants.countDivisionActions(originalSku),
    ]);
    if (originalPlant && originalPlant.costCents > 0) {
      const totalParts = existingDivisions + 2;
      costCents = (
        await calculateDivisionCost(businessContext, originalPlant.costCents, totalParts)
      ).costCents;
    }
  }

  await transplants.create({
    date: formDate(formData, "date"),
    originalSku,
    action,
    media: formStr(formData, "media") || null,
    fromPot,
    toPot: formStr(formData, "toPot") || null,
    idCode: formStr(formData, "idCode") || null,
    divisionSku: formStr(formData, "divisionSku") || null,
    costCents,
    potColor: formStr(formData, "potColor") || null,
    notes: formStr(formData, "notes") || null,
  });

  revalidateTransplantPaths(businessSlug);
  return { ok: true };
}

export async function createTreatmentTracking(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const treatments = createTreatmentTrackingRepository(businessContext);

  const sku = formStr(formData, "sku");
  if (!sku) return { ok: false, error: "SKU is required" };
  const logicResult = await runDateAppLogicSafely(
    businessContext,
    "treatmentTracking",
    {
      date: formDate(formData, "date"),
      nextEarliest: formDate(formData, "nextEarliest"),
      nextLatest: formDate(formData, "nextLatest"),
    }
  );
  if (!logicResult.ok) return logicResult;
  const calculatedDates = logicResult.value;

  await treatments.create({
    date: calculatedDates.date,
    sku,
    target: formStr(formData, "target") || null,
    product: formStr(formData, "product") || null,
    activeIngredient: formStr(formData, "activeIngredient") || null,
    epaNumber: formStr(formData, "epaNumber") || null,
    rate: formStr(formData, "rate") || null,
    potSize: formStr(formData, "potSize") || null,
    method: formStr(formData, "method") || null,
    initials: formStr(formData, "initials") || null,
    nextEarliest: calculatedDates.nextEarliest,
    nextLatest: calculatedDates.nextLatest,
  });

  revalidatePath(`/app/${businessSlug}/treatment-tracking`);
  return { ok: true };
}

export async function createFertilizerLog(businessSlug: string, formData: FormData) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const fertilizerLogs = createFertilizerLogRepository(businessContext);

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
  const logicResult = await runDateAppLogicSafely(
    businessContext,
    "fertilizerLog",
    { date, nextEarliest, nextLatest }
  );
  if (!logicResult.ok) return logicResult;
  const calculatedDates = logicResult.value;

  await fertilizerLogs.create({
    date: calculatedDates.date,
    plantSku: formStr(formData, "plantSku") || null,
    potSku: formStr(formData, "potSku") || null,
    product,
    method: formStr(formData, "method") || null,
    rate: formStr(formData, "rate") || null,
    unit: formStr(formData, "unit") || null,
    nextEarliest: calculatedDates.nextEarliest,
    nextLatest: calculatedDates.nextLatest,
    notes: formStr(formData, "notes") || null,
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);
  const existing = await plantIntakes.findById(id);
  if (!existing) return { ok: false, error: "Not found" };
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "plantIntake",
      "INTERACTIVE",
      {
        qty: data.qty ?? existing.qty,
        costCents: data.costCents ?? existing.costCents,
        msrpCents: data.msrpCents ?? existing.msrpCents,
      },
      { sourceRowId: id }
    )
  );
  if (!logicResult.ok) return logicResult;
  const plantExecution = logicResult.value;
  const plantLogic = plantExecution.scope;
  const calculatedQty = Math.round(plantLogic.qty);
  const calculatedCostCents = Math.round(plantLogic.costCents);
  const calculatedMsrpCents = Math.round(plantLogic.msrpCents);

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
  let productUpsert: {
    sku: string;
    productName: string;
    defaultCostCents: number;
    defaultSalePriceCents: number;
  } | null = null;
  const updateData: TenantPlantIntakeUpdateInput = {};
  if (dateValue !== undefined) updateData.date = dateValue;
  if (skuLookupChanged) {
    const nextSource = data.source ?? existing.source;
    const nextGenus = data.genus ?? existing.genus;
    const nextCultivar = data.cultivar ?? existing.cultivar;
    const nextLocationCode =
      data.locationCode !== undefined ? data.locationCode : existing.locationCode;

    if (nextGenus) {
      const generated = await withTenantRlsTransaction(businessContext, (tx) =>
        generateSku(tx, businessContext, {
          plantName: nextGenus,
          categoryName: nextSource || null,
          varietyName: nextCultivar || null,
          suffix: nextLocationCode || null,
        })
      );
      updateData.source = nextSource;
      updateData.genus = nextGenus;
      updateData.cultivar = nextCultivar;
      updateData.locationCode = nextLocationCode;
      updateData.sku = generated.sku;
      productUpsert = {
        sku: generated.sku,
        productName: [nextGenus, nextCultivar].filter(Boolean).join(" ") || nextGenus,
        defaultCostCents: calculatedCostCents,
        defaultSalePriceCents: calculatedMsrpCents,
      };
    } else {
      if (data.source !== undefined) updateData.source = data.source;
      if (data.genus !== undefined) updateData.genus = data.genus;
      if (data.cultivar !== undefined) updateData.cultivar = data.cultivar;
      if (data.locationCode !== undefined) updateData.locationCode = data.locationCode;
    }
  }
  updateData.qty = calculatedQty;
  updateData.costCents = calculatedCostCents;
  updateData.msrpCents = calculatedMsrpCents;
  if (data.potType !== undefined) updateData.potType = data.potType;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.cardLast4 !== undefined) updateData.cardLast4 = data.cardLast4;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.status !== undefined) updateData.status = data.status;

  if (productUpsert) {
    await withTenantRlsTransaction(businessContext, async (tx) => {
      const transactionalIntakes = createPlantIntakeRepository(
        businessContext,
        tx
      );
      const products = createProductRepository(businessContext, tx);
      await products.upsertBySku(
        productUpsert.sku,
        {
          productName: productUpsert.productName,
          defaultCostCents: productUpsert.defaultCostCents,
          defaultSalePriceCents: productUpsert.defaultSalePriceCents,
        },
        {
          productName: productUpsert.productName,
          defaultCostCents: productUpsert.defaultCostCents,
          defaultSalePriceCents: productUpsert.defaultSalePriceCents,
        }
      );
      const updated = await transactionalIntakes.updateById(id, updateData);
      if (!updated) throw new Error("Plant intake not found");
    });
  } else {
    const updated = await plantIntakes.updateById(id, updateData);
    if (!updated) return { ok: false, error: "Not found" };
  }
  const skuAfter = productUpsert?.sku ?? existing.sku;
  const genusAfter = data.genus ?? existing.genus;
  const cultivarAfter = data.cultivar ?? existing.cultivar;
  await executeGovernedAppLogicActions(
    businessContext,
    {
      module: "plantIntake",
      rowId: id,
      sku: skuAfter,
      productName: [genusAfter, cultivarAfter].filter(Boolean).join(" "),
      defaultCostCents: calculatedCostCents,
      defaultSalePriceCents: calculatedMsrpCents,
    },
    plantExecution.actions
  );
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const productIntakes = createProductIntakeRepository(businessContext);
  const existing = await productIntakes.findById(id);
  if (!existing) return { ok: false, error: "Not found" };

  const qty = data.qty ?? existing.qty;
  const totalCents = data.totalCostCents ?? existing.totalCostCents;
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "productIntake",
      "INTERACTIVE",
      { totalCostCents: totalCents, qty },
      { sourceRowId: id }
    )
  );
  if (!logicResult.ok) return logicResult;
  const productExecution = logicResult.value;
  const productLogic = productExecution.scope;
  const unitCostCents = Math.round(productLogic.unitCostCents);

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
  let productUpsert: {
    sku: string;
    productName: string;
    defaultCostCents: number;
    defaultSalePriceCents: number;
  } | null = null;
  const updateData: TenantProductIntakeUpdateInput = {
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
      const generated = await withTenantRlsTransaction(businessContext, (tx) =>
        generateSku(tx, businessContext, {
          plantName: nextSource,
          categoryName: nextCategory,
          varietyName: [nextSize, nextStyle].filter(Boolean).join(" ") || null,
          suffix: nextPurchaseNumber || null,
        })
      );
      updateData.source = nextSource;
      updateData.category = nextCategory;
      updateData.size = nextSize;
      updateData.style = nextStyle;
      updateData.purchaseNumber = nextPurchaseNumber;
      updateData.sku = generated.sku;
      productUpsert = {
        sku: generated.sku,
        productName: nextCategory,
        defaultCostCents: unitCostCents,
        defaultSalePriceCents: 0,
      };
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
  if (data.totalCostCents !== undefined)
    updateData.totalCostCents = data.totalCostCents;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.cardLast4 !== undefined) updateData.cardLast4 = data.cardLast4;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (productUpsert) {
    await withTenantRlsTransaction(businessContext, async (tx) => {
      const products = createProductRepository(businessContext, tx);
      const transactionalIntakes = createProductIntakeRepository(
        businessContext,
        tx
      );
      await products.upsertBySku(
        productUpsert.sku,
        {
          productName: productUpsert.productName,
          defaultCostCents: productUpsert.defaultCostCents,
          defaultSalePriceCents: productUpsert.defaultSalePriceCents,
        },
        {
          productName: productUpsert.productName,
          defaultCostCents: productUpsert.defaultCostCents,
        }
      );
      const updated = await transactionalIntakes.updateById(id, updateData);
      if (!updated) throw new Error("Product intake not found");
    });
  } else {
    const updated = await productIntakes.updateById(id, updateData);
    if (!updated) return { ok: false, error: "Not found" };
  }
  await executeGovernedAppLogicActions(
    businessContext,
    {
      module: "productIntake",
      rowId: id,
      sku: String(updateData.sku ?? existing.sku),
      productName:
        data.category !== undefined ? data.category : existing.category,
      defaultCostCents: unitCostCents,
    },
    productExecution.actions
  );
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const transplants = createTransplantLogRepository(businessContext);

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const updated = await transplants.updateById(id, {
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
  });
  if (!updated) return { ok: false, error: "Not found" };
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const treatments = createTreatmentTrackingRepository(businessContext);
  const existing = await treatments.findById(id);
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
  const logicResult = await runDateAppLogicSafely(
    businessContext,
    "treatmentTracking",
    {
      date: dateValue === undefined ? existing.date : dateValue,
      nextEarliest:
        nextEarliestValue === undefined
          ? existing.nextEarliest
          : nextEarliestValue,
      nextLatest:
        nextLatestValue === undefined ? existing.nextLatest : nextLatestValue,
    },
    id
  );
  if (!logicResult.ok) return logicResult;
  const calculatedDates = logicResult.value;

  const updated = await treatments.updateById(id, {
    date: calculatedDates.date,
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.target !== undefined && { target: data.target }),
    ...(data.product !== undefined && { product: data.product }),
    ...(data.activeIngredient !== undefined && { activeIngredient: data.activeIngredient }),
    ...(data.epaNumber !== undefined && { epaNumber: data.epaNumber }),
    ...(data.rate !== undefined && { rate: data.rate }),
    ...(data.potSize !== undefined && { potSize: data.potSize }),
    ...(data.method !== undefined && { method: data.method }),
    ...(data.initials !== undefined && { initials: data.initials }),
    nextEarliest: calculatedDates.nextEarliest,
    nextLatest: calculatedDates.nextLatest,
  });
  if (!updated) return { ok: false, error: "Not found" };
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);
  const existing = await overheadExpenses.findById(id);
  if (!existing) return { ok: false, error: "Not found" };

  const subTotalCents = data.subTotalCents ?? existing.subTotalCents;
  const shippingCents = data.shippingCents ?? existing.shippingCents;
  const discountCents = data.discountCents ?? existing.discountCents;
  const qty = data.qty ?? existing.qty;
  const logicResult = await runAppLogicSafely(() =>
    runDetailedAppLogicRowPipeline(
      businessContext,
      "overheadExpenses",
      "INTERACTIVE",
      { subTotalCents, shippingCents, discountCents, qty },
      { sourceRowId: id }
    )
  );
  if (!logicResult.ok) return logicResult;
  const overheadLogic = logicResult.value.scope;
  const unitCostCents = Math.round(overheadLogic.unitCostCents);
  const totalCents = Math.round(overheadLogic.totalCents);

  const dateValue =
    data.date !== undefined
      ? data.date === null || data.date === ""
        ? null
        : new Date(data.date)
      : undefined;

  const updated = await overheadExpenses.updateById(id, {
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
  });
  if (!updated) return { ok: false, error: "Not found" };
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const fertilizerLogs = createFertilizerLogRepository(businessContext);
  const existing = await fertilizerLogs.findById(id);
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
  const logicResult = await runDateAppLogicSafely(
    businessContext,
    "fertilizerLog",
    {
      date: dateValue === undefined ? existing.date : dateValue,
      nextEarliest:
        nextEarliestValue === undefined
          ? existing.nextEarliest
          : nextEarliestValue,
      nextLatest:
        nextLatestValue === undefined ? existing.nextLatest : nextLatestValue,
    },
    id
  );
  if (!logicResult.ok) return logicResult;
  const calculatedDates = logicResult.value;

  const updated = await fertilizerLogs.updateById(id, {
    date: calculatedDates.date,
    ...(data.plantSku !== undefined && { plantSku: data.plantSku }),
    ...(data.potSku !== undefined && { potSku: data.potSku }),
    ...(data.product !== undefined && { product: data.product }),
    ...(data.method !== undefined && { method: data.method }),
    ...(data.rate !== undefined && { rate: data.rate }),
    ...(data.unit !== undefined && { unit: data.unit }),
    nextEarliest: calculatedDates.nextEarliest,
    nextLatest: calculatedDates.nextLatest,
    ...(data.notes !== undefined && { notes: data.notes }),
  });
  if (!updated) return { ok: false, error: "Not found" };
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  return { ok: true };
}

export async function deleteSalesEntry(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);
  const deleted = await sales.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidateSalesPaths(businessSlug);
  return { ok: true };
}

export async function deletePlantIntake(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);
  const deleted = await plantIntakes.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidatePlantIntakePaths(businessSlug);
  return { ok: true };
}

export async function deleteProductIntake(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const productIntakes = createProductIntakeRepository(businessContext);
  const deleted = await productIntakes.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidateProductIntakePaths(businessSlug);
  return { ok: true };
}

export async function deleteOverheadExpense(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);
  const deleted = await overheadExpenses.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  return { ok: true };
}

export async function deleteTransplantLog(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const transplants = createTransplantLogRepository(businessContext);
  const deleted = await transplants.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidateTransplantPaths(businessSlug);
  return { ok: true };
}

export async function deleteFertilizerLog(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const fertilizerLogs = createFertilizerLogRepository(businessContext);
  const deleted = await fertilizerLogs.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  return { ok: true };
}

export async function deleteTreatmentTracking(id: string, businessSlug: string) {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const treatments = createTreatmentTrackingRepository(businessContext);
  const deleted = await treatments.deleteById(id);
  if (!deleted) return { ok: false, error: "Not found" };
  revalidatePath(`/app/${businessSlug}/treatment-tracking`);
  return { ok: true };
}
