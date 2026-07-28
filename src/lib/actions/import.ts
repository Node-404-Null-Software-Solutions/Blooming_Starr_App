"use server";

import { requireBusinessRole } from "@/lib/authz";
import type { BusinessContext } from "@/lib/business-context";
import { revalidatePath } from "next/cache";
import { loadAuditedDetailedAppLogicRowPipeline } from "@/lib/app-logic-row-service";
import { appLogicFailureMessage } from "@/lib/app-logic-audit";
import {
  dateFieldsFromAppLogicScope,
  dateFieldsToAppLogicScope,
} from "@/lib/app-logic-row-mapping";
import {
  buildHeaderMap,
  chunk,
  findHeaderRow,
  loadWorkbookFromFile,
  normalizeHeader,
  parseCurrencyToCents,
  parseDate,
  parseIntSafe,
  toStringCell,
  type Workbook,
  type Worksheet,
} from "@/lib/import/xlsx";
import {
  createFertilizerLogRepository,
  type TenantFertilizerLogCreateManyInput,
} from "@/lib/repositories/fertilizer-log";
import { createLookupEntryRepository } from "@/lib/repositories/lookup-entry";
import {
  createPlantIntakeRepository,
  type TenantPlantIntakeCreateManyInput,
} from "@/lib/repositories/plant-intake";
import { resolvePlantIntakeUnitCostCents } from "@/lib/plant-intake-cost";
import {
  createOverheadExpenseRepository,
  type TenantOverheadExpenseCreateManyInput,
} from "@/lib/repositories/overhead-expense";
import {
  createProductIntakeRepository,
  type TenantProductIntakeCreateManyInput,
} from "@/lib/repositories/product-intake";
import { createPricingEntryRepository } from "@/lib/repositories/pricing-entry";
import {
  createSalesRepository,
  type TenantSalesCreateManyInput,
} from "@/lib/repositories/sales";
import {
  createTransplantLogRepository,
  type TenantTransplantLogCreateManyInput,
} from "@/lib/repositories/transplant-log";
import {
  createTreatmentTrackingRepository,
  type TenantTreatmentTrackingCreateManyInput,
} from "@/lib/repositories/treatment-tracking";


function findSheetStrict(
  workbook: Workbook,
  candidates: string[]
): Worksheet | null {
  const normalized = new Set(candidates.map((n) => n.trim().toLowerCase()));
  return workbook.worksheets.find((ws) => normalized.has(ws.name.trim().toLowerCase())) ?? null;
}


export type SheetResult = {
  inserted: number;
  skippedMissing: number;
  skippedDuplicates: number;
  notFound?: true;
};

export type LookupResult = {
  added: number;
  alreadyExisted: number;
};

export type ImportReport = {
  sheets: Record<string, SheetResult>;
  lookups: Record<string, LookupResult>;
  error?: string;
};


function revalidateImportedDataPaths(businessSlug: string) {
  const base = `/app/${businessSlug}`;
  revalidatePath(`${base}/plant-intake`);
  revalidatePath(`${base}/product-intake`);
  revalidatePath(`${base}/sales`);
  revalidatePath(`${base}/overhead-expenses`);
  revalidatePath(`${base}/transplant-log`);
  revalidatePath(`${base}/fertilizer-log`);
  revalidatePath(`${base}/treatment-tracking`);
  revalidatePath(base);
  revalidatePath(`${base}/plant-inventory`);
  revalidatePath(`${base}/product-inventory`);
  revalidatePath(`${base}/sku-scanner`);
}


type NameCode = { name: string; code: string };


function autoCode(name: string, seen: Set<string>): string {
  let base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  if (!base) base = "ITEM";
  let code = base;
  let n = 2;
  while (seen.has(code)) {
    code = base.slice(0, 6) + String(n++).padStart(2, "0");
  }
  seen.add(code);
  return code;
}


async function seedLookup(
  businessContext: BusinessContext,
  table: string,
  entries: NameCode[]
): Promise<LookupResult> {
  if (!entries.length) return { added: 0, alreadyExisted: 0 };
  const lookupEntries = createLookupEntryRepository(businessContext);


  const seenNames = new Set<string>();
  const seenCodes = new Set<string>();
  const deduped: NameCode[] = [];
  for (const e of entries) {
    const nk = e.name.toLowerCase();
    const ck = e.code.toUpperCase();
    if (seenNames.has(nk) || seenCodes.has(ck)) continue;
    seenNames.add(nk);
    seenCodes.add(ck);
    deduped.push({ name: e.name, code: ck });
  }

  const data = deduped.map((e) => ({
    table,
    name: e.name,
    code: e.code,
    parentCode: null,
    sortOrder: 0,
  }));

  let added = 0;
  for (const part of chunk(data, 500)) {
    const res = await lookupEntries.createMany(part, { skipDuplicates: true });
    added += res.count;
  }

  return { added, alreadyExisted: deduped.length - added };
}


function readColumnPairs(
  ws: Worksheet,
  nameCol: number,
  codeCol: number,
  headerRow: number
): NameCode[] {
  const pairs: NameCode[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn <= headerRow) return;
    const name = toStringCell(row.getCell(nameCol).value).trim();
    const code = toStringCell(row.getCell(codeCol).value).trim().toUpperCase();
    if (name && code) pairs.push({ name, code });
  });
  return pairs;
}


function readColumnNames(
  ws: Worksheet,
  nameCol: number,
  headerRow: number
): string[] {
  const names: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn <= headerRow) return;
    const name = toStringCell(row.getCell(nameCol).value).trim();
    if (name) names.push(name);
  });
  return names;
}


function namesToNameCode(names: string[]): NameCode[] {
  const usedCodes = new Set<string>();
  return [...new Set(names)].filter(Boolean).map((n) => ({
    name: n,
    code: autoCode(n, usedCodes),
  }));
}


function addResults(a: LookupResult, b: LookupResult): LookupResult {
  return { added: a.added + b.added, alreadyExisted: a.alreadyExisted + b.alreadyExisted };
}


async function parsePlantKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Plant Sources"] = await seedLookup(
    businessContext, "plantSource", readColumnPairs(ws, 1, 2, HEADER_ROW)
  );
  lookups["Genera"] = await seedLookup(
    businessContext, "genus", readColumnPairs(ws, 3, 4, HEADER_ROW)
  );
  lookups["Cultivars"] = await seedLookup(
    businessContext, "cultivar", readColumnPairs(ws, 5, 6, HEADER_ROW)
  );


  const idNames = readColumnNames(ws, 8, HEADER_ROW);
  const plantIds = [...new Set(idNames)].filter(Boolean).map((n) => ({
    name: n,
    code: n.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 10) || n.slice(0, 10),
  }));
  lookups["Plant IDs"] = await seedLookup(
    businessContext,
    "plantId",
    plantIds
  );


  lookups["Payment Methods"] = await seedLookup(
    businessContext,
    "paymentMethod",
    namesToNameCode(readColumnNames(ws, 9, HEADER_ROW))
  );
}


async function parseProductKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Product Sources"] = await seedLookup(
    businessContext, "productSource", readColumnPairs(ws, 2, 3, HEADER_ROW)
  );
  lookups["Product Categories"] = await seedLookup(
    businessContext, "productCategory", readColumnPairs(ws, 4, 5, HEADER_ROW)
  );
  lookups["Product Sizes"] = await seedLookup(
    businessContext, "productSize", readColumnPairs(ws, 6, 7, HEADER_ROW)
  );
  lookups["Product Styles"] = await seedLookup(
    businessContext, "productStyle", readColumnPairs(ws, 8, 9, HEADER_ROW)
  );
}


async function parseTransplantKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {

  const headerRow = findHeaderRow(ws, ["Media"]) ??
    findHeaderRow(ws, ["Action"]) ??
    findHeaderRow(ws, ["Pot Size"]);

  if (!headerRow) return;

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cMedia = col("Media");
  const cAction = col("Action");
  const cFromPot = col("From Pot Size", "From Pot", "From");
  const cToPot = col("To Pot Size", "To Pot", "To");

  const media: string[] = [];
  const actions: string[] = [];
  const potSizes: string[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;

    if (cMedia) {
      const v = toStringCell(row.getCell(cMedia).value);
      if (v) media.push(v);
    }
    if (cAction) {
      const v = toStringCell(row.getCell(cAction).value);
      if (v) actions.push(v);
    }
    if (cFromPot) {
      const v = toStringCell(row.getCell(cFromPot).value);
      if (v) potSizes.push(v);
    }
    if (cToPot) {
      const v = toStringCell(row.getCell(cToPot).value);
      if (v) potSizes.push(v);
    }
  });

  const usedCodes = new Set<string>();
  const toNameCode = (names: string[]): NameCode[] =>
    [...new Set(names)].filter(Boolean).map((n) => ({
      name: n,
      code: autoCode(n, usedCodes),
    }));

  if (cMedia) {
    lookups["Transplant Media"] = await seedLookup(
      businessContext,
      "transplantMedia",
      toNameCode(media)
    );
  }
  if (cAction) {
    lookups["Transplant Actions"] = await seedLookup(
      businessContext,
      "transplantAction",
      toNameCode(actions)
    );
  }
  if (cFromPot || cToPot) {
    lookups["Pot Sizes"] = await seedLookup(
      businessContext,
      "potSize",
      toNameCode(potSizes)
    );
  }
}


async function parseTreatmentKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const headerRow = findHeaderRow(ws, ["Product"]);
  if (!headerRow) return;

  const headerMap = buildHeaderMap(headerRow);
  const cProduct = headerMap.get(normalizeHeader("Product")) ?? null;
  if (!cProduct) return;

  const names: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const v = toStringCell(row.getCell(cProduct).value);
    if (v) names.push(v);
  });

  const usedCodes = new Set<string>();
  const entries = [...new Set(names)].filter(Boolean).map((n) => ({
    name: n,
    code: autoCode(n, usedCodes),
  }));

  lookups["Treatment Products"] = await seedLookup(
    businessContext,
    "treatmentProduct",
    entries
  );
}


async function parseFertilizerKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const headerRow =
    findHeaderRow(ws, ["Product Name"]) ?? findHeaderRow(ws, ["Product"]);
  if (!headerRow) return;

  const headerMap = buildHeaderMap(headerRow);
  const cProduct =
    headerMap.get(normalizeHeader("Product Name")) ??
    headerMap.get(normalizeHeader("Product")) ??
    null;
  if (!cProduct) return;

  const names: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const v = toStringCell(row.getCell(cProduct).value);
    if (v) names.push(v);
  });

  const usedCodes = new Set<string>();
  const entries = [...new Set(names)].filter(Boolean).map((n) => ({
    name: n,
    code: autoCode(n, usedCodes),
  }));

  lookups["Fertilizer Products"] = await seedLookup(
    businessContext,
    "fertilizerProduct",
    entries
  );
}


async function parseOverheadKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Expense Vendors"] = await seedLookup(
    businessContext,
    "expenseVendor",
    namesToNameCode(readColumnNames(ws, 2, HEADER_ROW))
  );
  lookups["Expense Categories"] = await seedLookup(
    businessContext,
    "expenseCategory",
    namesToNameCode(readColumnNames(ws, 4, HEADER_ROW))
  );


  const pmtResult = await seedLookup(
    businessContext,
    "paymentMethod",
    namesToNameCode(readColumnNames(ws, 6, HEADER_ROW))
  );
  lookups["Payment Methods"] = addResults(
    lookups["Payment Methods"] ?? { added: 0, alreadyExisted: 0 },
    pmtResult
  );
}


async function parseSkuKey(
  ws: Worksheet,
  businessContext: BusinessContext,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Plant Sources"] = addResults(
    lookups["Plant Sources"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(
      businessContext,
      "plantSource",
      readColumnPairs(ws, 1, 2, HEADER_ROW)
    )
  );
  lookups["Genera"] = addResults(
    lookups["Genera"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(
      businessContext,
      "genus",
      readColumnPairs(ws, 3, 4, HEADER_ROW)
    )
  );
  lookups["Cultivars"] = addResults(
    lookups["Cultivars"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(
      businessContext,
      "cultivar",
      readColumnPairs(ws, 5, 6, HEADER_ROW)
    )
  );


  const idNames = readColumnNames(ws, 7, HEADER_ROW);
  const plantIds = [...new Set(idNames)].filter(Boolean).map((n) => ({
    name: n,
    code: n.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 10) || n.slice(0, 10),
  }));
  lookups["Plant IDs"] = addResults(
    lookups["Plant IDs"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(businessContext, "plantId", plantIds)
  );


  lookups["Origins"] = await seedLookup(
    businessContext, "origin", readColumnPairs(ws, 9, 10, HEADER_ROW)
  );


  lookups["Statuses"] = await seedLookup(
    businessContext, "status", readColumnPairs(ws, 12, 13, HEADER_ROW)
  );


  lookups["Environments"] = await seedLookup(
    businessContext, "environment", readColumnPairs(ws, 15, 16, HEADER_ROW)
  );
}


function last4FromCell(value: unknown): string | null {
  const digits = toStringCell(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 4 ? digits : digits.slice(-4);
}

function dateKey(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

async function importPlantIntake(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const plantIntakes = createPlantIntakeRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Source", "SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cSource = col("Source");
  const cGenus = col("Genus");
  const cCultivar = col("Cultivar");
  const cId = col("ID #", "ID#", "ID");
  const cSku = col("SKU");
  const cUnitCost = col("Unit Cost", "Cost");
  const cTotalCost = col("Total Cost");
  const cLocation = col("Location");
  const cStatus = col("Status");
  const cMsrp = col("MSRP");
  const cQty = col("QTY", "Qty", "Quantity");
  const cPot = col("Pot Type", "PotType");

  if (!cSku || !cSource || !cGenus || !cCultivar) {
    return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }


  const skus: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (sku) skus.push(sku);
  });

  const existingSku = new Set<string>();
  for (const part of chunk([...new Set(skus)], 1000)) {
    const rows = await plantIntakes.listExistingSkus(part);
    for (const r of rows) existingSku.add(r.sku);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenSku = new Set<string>();

  const toCreate: TenantPlantIntakeCreateManyInput[] = [];
  const calculatePlantIntake = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "plantIntake",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;
      const source = cSource ? toStringCell(row.getCell(cSource).value) : "";
      const genus = cGenus ? toStringCell(row.getCell(cGenus).value) : "";
      const cultivar = cCultivar ? toStringCell(row.getCell(cCultivar).value) : "";
      const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";

      if (!source || !genus || !cultivar || !sku) { skippedMissing++; return; }

      if (existingSku.has(sku) || seenSku.has(sku)) { skippedDuplicates++; return; }
      seenSku.add(sku);

      const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
      const importedUnitCostCents = resolvePlantIntakeUnitCostCents({
        unitCostCents: cUnitCost
          ? parseCurrencyToCents(row.getCell(cUnitCost).value)
          : undefined,
        totalCostCents: cTotalCost
          ? parseCurrencyToCents(row.getCell(cTotalCost).value)
          : undefined,
        quantity: qty,
      });
      const msrpCents = cMsrp ? parseCurrencyToCents(row.getCell(cMsrp).value) : 0;
      const plantLogic = calculatePlantIntake.run({
        qty: qty > 0 ? qty : 1,
        costCents:
          importedUnitCostCents >= 0 ? importedUnitCostCents : 0,
        msrpCents: msrpCents >= 0 ? msrpCents : 0,
      }).scope;

      toCreate.push({
        date: cDate ? parseDate(row.getCell(cDate).value) : null,
        source, genus, cultivar, sku,
        locationCode: cId ? toStringCell(row.getCell(cId).value) || null : null,
        qty: Math.round(plantLogic.qty),
        costCents: Math.round(plantLogic.costCents),
        msrpCents: Math.round(plantLogic.msrpCents),
        potType: cPot ? toStringCell(row.getCell(cPot).value) || null : null,
        paymentMethod: null, cardLast4: null,
        location: cLocation ? toStringCell(row.getCell(cLocation).value) || null : null,
        status: cStatus ? toStringCell(row.getCell(cStatus).value) || null : null,
      });
    });
  } catch (error) {
    await calculatePlantIntake.flush();
    throw error;
  }
  await calculatePlantIntake.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await plantIntakes.createMany(part);
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importProductIntake(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const productIntakes = createProductIntakeRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Date", "Code / SKU"]) ??
    findHeaderRow(ws, ["Date", "SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cSku = col("Code / SKU", "SKU", "Code/SKU");
  const cVendor = col("Vendor");
  const cSource = col("Source");
  const cCategory = col("Category");
  const cSize = col("Size");
  const cStyle = col("Style");
  const cPurchase = col("Pur #");
  const cQty = col("Qty");
  const cTotalCost = col("Tot Cost", "Total Cost");
  const cUnitCost = col("Unit Cost");
  const cPayment = col("Pmt Method", "Payment Method");
  const cCard = col("Card #");
  const cInvoice = col("Invoice #");
  const cNotes = col("Associated Product / Notes", "Notes");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const existingRows = await productIntakes.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) => `${row.sku}|${dateKey(row.date)}`)
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();

  const toCreate: TenantProductIntakeCreateManyInput[] = [];
  const calculateProductIntake = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "productIntake",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (!date || !sku) { skippedMissing++; return; }

    const key = `${sku}|${dateKey(date)}`;
    if (existingComposite.has(key) || seenComposite.has(key)) { skippedDuplicates++; return; }
    seenComposite.add(key);

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const importedUnitCostCents = cUnitCost
      ? parseCurrencyToCents(row.getCell(cUnitCost).value)
      : 0;
    const totalCostCents = cTotalCost
      ? parseCurrencyToCents(row.getCell(cTotalCost).value)
      : importedUnitCostCents * qty;
    const productLogic = calculateProductIntake.run({
      totalCostCents,
      qty,
    }).scope;
    const unitCostCents = Math.round(productLogic.unitCostCents);

    toCreate.push({
      date, sku,
      vendor: cVendor ? toStringCell(row.getCell(cVendor).value) || null : null,
      source: cSource ? toStringCell(row.getCell(cSource).value) || null : null,
      category: cCategory ? toStringCell(row.getCell(cCategory).value) || null : null,
      size: cSize ? toStringCell(row.getCell(cSize).value) || null : null,
      style: cStyle ? toStringCell(row.getCell(cStyle).value) || null : null,
      purchaseNumber: cPurchase ? toStringCell(row.getCell(cPurchase).value) || null : null,
      qty,
      totalCostCents,
      unitCostCents,
      paymentMethod: cPayment ? toStringCell(row.getCell(cPayment).value) || null : null,
      cardLast4: cCard ? last4FromCell(row.getCell(cCard).value) : null,
      invoiceNumber: cInvoice ? toStringCell(row.getCell(cInvoice).value) || null : null,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
    });
    });
  } catch (error) {
    await calculateProductIntake.flush();
    throw error;
  }
  await calculateProductIntake.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await productIntakes.createMany(part, {
      skipDuplicates: true,
    });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

type SalesResult = SheetResult & { salesChannelLookup: LookupResult };

async function importSales(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SalesResult> {
  const sales = createSalesRepository(businessContext);
  const emptyLookup: LookupResult = { added: 0, alreadyExisted: 0 };
  const headerRow = findHeaderRow(ws, ["Date", "SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true, salesChannelLookup: emptyLookup };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cSku = col("SKU");
  const cCustomerName = col("Customer Name", "Customer");
  const cItemName = col("Item Name");
  const cStatus = col("Status", "Sale Status");
  const cQty = col("Qty");
  const cSalePrice = col("Sale Price");
  const cCost = col("Cost");
  const cPayment = col("Payment Method");
  const cCard = col("Card #");
  const cChannel = col("Sale Channel");
  const cNotes = col("Notes");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true, salesChannelLookup: emptyLookup };

  const existingRows = await sales.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) =>
      `${row.sku}|${dateKey(row.date)}|${row.qty}|${row.salePriceCents}|${row.channel ?? ""}`
    )
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();
  const channelNames = new Set<string>();

  const toCreate: TenantSalesCreateManyInput[] = [];
  const calculateSales = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "sales",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (!date || !sku) { skippedMissing++; return; }

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const salePriceCents = cSalePrice ? parseCurrencyToCents(row.getCell(cSalePrice).value) : 0;
    const costCents = cCost ? parseCurrencyToCents(row.getCell(cCost).value) : 0;
    const derived = calculateSales.run({ qty, salePriceCents, costCents }).scope;

    const channelVal = cChannel ? toStringCell(row.getCell(cChannel).value).trim() : "";
    if (channelVal) channelNames.add(channelVal);
    const key = `${sku}|${dateKey(date)}|${qty}|${salePriceCents}|${channelVal}`;
    if (existingComposite.has(key) || seenComposite.has(key)) { skippedDuplicates++; return; }
    seenComposite.add(key);

    toCreate.push({
      date, sku,
      customerName: cCustomerName
        ? toStringCell(row.getCell(cCustomerName).value) || null
        : null,
      itemName: cItemName ? toStringCell(row.getCell(cItemName).value) || null : null,
      status: cStatus
        ? toStringCell(row.getCell(cStatus).value) || "Sold"
        : "Sold",
      qty: Math.round(derived.qty), salePriceCents,
      totalSaleCents: Math.round(derived.totalSaleCents),
      paymentMethod: cPayment ? toStringCell(row.getCell(cPayment).value) || null : null,
      cardLast4: cCard ? last4FromCell(row.getCell(cCard).value) : null,
      channel: channelVal || null,
      costCents, profitCents: Math.round(derived.profitCents), marginPct: derived.marginPct,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
    });
    });
  } catch (error) {
    await calculateSales.flush();
    throw error;
  }
  await calculateSales.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await sales.createMany(part, { skipDuplicates: true });
    inserted += res.count;
  }

  const salesChannelLookup = await seedLookup(
    businessContext,
    "salesChannel",
    namesToNameCode([...channelNames])
  );

  return { inserted, skippedMissing, skippedDuplicates, salesChannelLookup };
}

async function importOverheadExpenses(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const overheadExpenses = createOverheadExpenseRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Date"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cVendor = col("Vendor");
  const cBrand = col("Brand");
  const cCategory = col("Category");
  const cDescription = col("Description");
  const cQty = col("Qty");
  const cSubTotal = col("Sub Tot");
  const cShipping = col("Ship.");
  const cDiscount = col("Disc.");
  const cTotal = col("Act. Tot");
  const cPayment = col("Pmt. M.");
  const cCard = col("Card #");
  const cInvoice = col("Invoice #");
  const cNotes = col("Notes / Project", "Notes");

  if (!cDate) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const existingRows = await overheadExpenses.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) =>
      `${row.invoiceNumber ?? ""}|${dateKey(row.date)}|${row.totalCents}|${row.vendor ?? ""}`
    )
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();

  const toCreate: TenantOverheadExpenseCreateManyInput[] = [];
  const calculateOverhead = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "overheadExpenses",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const vendor = cVendor ? toStringCell(row.getCell(cVendor).value) || null : null;
    const importedTotalCents = cTotal ? parseCurrencyToCents(row.getCell(cTotal).value) : 0;

    if (!date || (!vendor && importedTotalCents === 0)) { skippedMissing++; return; }

    const invoiceNumber = cInvoice ? toStringCell(row.getCell(cInvoice).value) || "" : "";
    const key = `${invoiceNumber}|${dateKey(date)}|${importedTotalCents}|${vendor ?? ""}`;
    if (existingComposite.has(key) || seenComposite.has(key)) { skippedDuplicates++; return; }
    seenComposite.add(key);

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const subTotalCents = cSubTotal
      ? parseCurrencyToCents(row.getCell(cSubTotal).value)
      : importedTotalCents;
    const shippingCents = cShipping
      ? parseCurrencyToCents(row.getCell(cShipping).value)
      : 0;
    const discountCents = cDiscount
      ? parseCurrencyToCents(row.getCell(cDiscount).value)
      : 0;
    const overheadLogic = calculateOverhead.run({
      subTotalCents,
      shippingCents,
      discountCents,
      qty,
    }).scope;
    const unitCostCents = Math.round(overheadLogic.unitCostCents);
    const totalCents = Math.round(overheadLogic.totalCents);

    toCreate.push({
      date, vendor,
      brand: cBrand ? toStringCell(row.getCell(cBrand).value) || null : null,
      category: cCategory ? toStringCell(row.getCell(cCategory).value) || null : null,
      description: cDescription ? toStringCell(row.getCell(cDescription).value) || null : null,
      qty,
      subTotalCents,
      shippingCents,
      discountCents,
      unitCostCents,
      totalCents,
      paymentMethod: cPayment ? toStringCell(row.getCell(cPayment).value) || null : null,
      cardLast4: cCard ? last4FromCell(row.getCell(cCard).value) : null,
      invoiceNumber: cInvoice ? toStringCell(row.getCell(cInvoice).value) || null : null,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
    });
    });
  } catch (error) {
    await calculateOverhead.flush();
    throw error;
  }
  await calculateOverhead.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await overheadExpenses.createMany(part, { skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importTransplantLog(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const transplants = createTransplantLogRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Date", "Original SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cOriginalSku = col("Original SKU");
  const cAction = col("Action");
  const cMedia = col("Media");
  const cFromPot = col("From Pot");
  const cToPot = col("To Pot");
  const cId = col("ID");
  const cDivisionSku = col("Division SKU");
  const cPer = col("$ PER");
  const cPotColor = col("POT COLOR", "Pot Color");
  const cNotes = col("Notes");
  const cCreatedAt = col("Created At");

  if (!cDate || !cOriginalSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const existingRows = await transplants.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) =>
      `${row.originalSku ?? ""}|${dateKey(row.date)}|${row.action ?? ""}|${row.divisionSku ?? ""}`
    )
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();

  const toCreate: TenantTransplantLogCreateManyInput[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const originalSku = cOriginalSku ? toStringCell(row.getCell(cOriginalSku).value) : "";
    if (!date || !originalSku) { skippedMissing++; return; }

    const action = cAction ? toStringCell(row.getCell(cAction).value) || null : null;
    const divisionSku = cDivisionSku ? toStringCell(row.getCell(cDivisionSku).value) || null : null;
    const key = `${originalSku}|${dateKey(date)}|${action ?? ""}|${divisionSku ?? ""}`;
    if (existingComposite.has(key) || seenComposite.has(key)) { skippedDuplicates++; return; }
    seenComposite.add(key);

    toCreate.push({
      date, originalSku,
      action,
      media: cMedia ? toStringCell(row.getCell(cMedia).value) || null : null,
      fromPot: cFromPot ? toStringCell(row.getCell(cFromPot).value) || null : null,
      toPot: cToPot ? toStringCell(row.getCell(cToPot).value) || null : null,
      idCode: cId ? toStringCell(row.getCell(cId).value) || null : null,
      divisionSku,
      costCents: cPer ? parseCurrencyToCents(row.getCell(cPer).value) : 0,
      potColor: cPotColor ? toStringCell(row.getCell(cPotColor).value) || null : null,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
      createdAtSource: cCreatedAt ? parseDate(row.getCell(cCreatedAt).value) : null,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await transplants.createMany(part, { skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importFertilizerLog(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const fertilizerLogs = createFertilizerLogRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Date", "Plant SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cPlantSku = col("Plant SKU");
  const cPotSku = col("Pot SKU");
  const cProduct = col("Product");
  const cMethod = col("Method");
  const cRate = col("Rate");
  const cUnit = col("Unit");
  const cNextEarliest = col("Next Earliest");
  const cNextLatest = col("Next Latest");
  const cNotes = col("Notes");

  if (!cDate || !cPlantSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const existingRows = await fertilizerLogs.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) =>
      `${row.plantSku ?? ""}|${dateKey(row.date)}|${row.product ?? ""}|${row.method ?? ""}`
    )
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();

  const toCreate: TenantFertilizerLogCreateManyInput[] = [];
  const calculateFertilizerLog = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "fertilizerLog",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;
      const date = cDate ? parseDate(row.getCell(cDate).value) : null;
      const plantSku = cPlantSku
        ? toStringCell(row.getCell(cPlantSku).value)
        : "";
      if (!date || !plantSku) {
        skippedMissing++;
        return;
      }

      const product = cProduct
        ? toStringCell(row.getCell(cProduct).value) || null
        : null;
      const method = cMethod
        ? toStringCell(row.getCell(cMethod).value) || null
        : null;
      const key = `${plantSku}|${dateKey(date)}|${product ?? ""}|${method ?? ""}`;
      if (existingComposite.has(key) || seenComposite.has(key)) {
        skippedDuplicates++;
        return;
      }
      seenComposite.add(key);

      const calculatedDates = dateFieldsFromAppLogicScope(
        calculateFertilizerLog.run(
          dateFieldsToAppLogicScope({
            date,
            nextEarliest: cNextEarliest
              ? parseDate(row.getCell(cNextEarliest).value)
              : null,
            nextLatest: cNextLatest
              ? parseDate(row.getCell(cNextLatest).value)
              : null,
          })
        ).scope
      );

      toCreate.push({
        date: calculatedDates.date,
        plantSku,
        potSku: cPotSku
          ? toStringCell(row.getCell(cPotSku).value) || null
          : null,
        product,
        method,
        rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
        unit: cUnit ? toStringCell(row.getCell(cUnit).value) || null : null,
        nextEarliest: calculatedDates.nextEarliest,
        nextLatest: calculatedDates.nextLatest,
        notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
      });
    });
  } catch (error) {
    await calculateFertilizerLog.flush();
    throw error;
  }
  await calculateFertilizerLog.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await fertilizerLogs.createMany(part, { skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importTreatmentTracking(
  ws: Worksheet,
  businessContext: BusinessContext
): Promise<SheetResult> {
  const treatments = createTreatmentTrackingRepository(businessContext);
  const headerRow = findHeaderRow(ws, ["Date", "SKU"]);
  if (!headerRow) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const headerMap = buildHeaderMap(headerRow);
  const col = (...names: string[]): number | null => {
    for (const n of names) {
      const c = headerMap.get(normalizeHeader(n));
      if (c) return c;
    }
    return null;
  };

  const cDate = col("Date");
  const cSku = col("SKU");
  const cTarget = col("Target");
  const cProduct = col("Product");
  const cActive = col("Act Ing", "Active Ingredient");
  const cEpa = col("EPA #");
  const cRate = col("Rate");
  const cPot = col("Pot Sz", "Pot Size");
  const cMethod = col("Method");
  const cInit = col("Init.", "Initials");
  const cNotes = col("Notes");
  const cNextEarliest = col("Next Earliest");
  const cNextLatest = col("Next Latest");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const existingRows = await treatments.listForImportDeduplication();
  const existingComposite = new Set(
    existingRows.map((row) =>
      `${row.sku}|${dateKey(row.date)}|${row.target ?? ""}|${row.product ?? ""}`
    )
  );

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenComposite = new Set<string>();

  const toCreate: TenantTreatmentTrackingCreateManyInput[] = [];
  const calculateTreatmentTracking = await loadAuditedDetailedAppLogicRowPipeline(
    businessContext,
    "treatmentTracking",
    "IMPORT"
  );

  try {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;
      const date = cDate ? parseDate(row.getCell(cDate).value) : null;
      const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
      if (!date || !sku) {
        skippedMissing++;
        return;
      }

      const target = cTarget
        ? toStringCell(row.getCell(cTarget).value) || null
        : null;
      const product = cProduct
        ? toStringCell(row.getCell(cProduct).value) || null
        : null;
      const key = `${sku}|${dateKey(date)}|${target ?? ""}|${product ?? ""}`;
      if (existingComposite.has(key) || seenComposite.has(key)) {
        skippedDuplicates++;
        return;
      }
      seenComposite.add(key);

      const calculatedDates = dateFieldsFromAppLogicScope(
        calculateTreatmentTracking.run(
          dateFieldsToAppLogicScope({
            date,
            nextEarliest: cNextEarliest
              ? parseDate(row.getCell(cNextEarliest).value)
              : null,
            nextLatest: cNextLatest
              ? parseDate(row.getCell(cNextLatest).value)
              : null,
          })
        ).scope
      );

      toCreate.push({
        date: calculatedDates.date,
        sku,
        target,
        product,
        activeIngredient: cActive
          ? toStringCell(row.getCell(cActive).value) || null
          : null,
        epaNumber: cEpa
          ? toStringCell(row.getCell(cEpa).value) || null
          : null,
        rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
        potSize: cPot ? toStringCell(row.getCell(cPot).value) || null : null,
        method: cMethod
          ? toStringCell(row.getCell(cMethod).value) || null
          : null,
        initials: cInit ? toStringCell(row.getCell(cInit).value) || null : null,
        notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
        nextEarliest: calculatedDates.nextEarliest,
        nextLatest: calculatedDates.nextLatest,
      });
    });
  } catch (error) {
    await calculateTreatmentTracking.flush();
    throw error;
  }
  await calculateTreatmentTracking.flush();

  for (const part of chunk(toCreate, 1000)) {
    const res = await treatments.createMany(part, { skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

export async function importWorkbook(
  businessSlug: string,
  formData: FormData
): Promise<ImportReport> {
  const { businessContext } = await requireBusinessRole(businessSlug, [
    "OWNER",
    "MANAGER",
  ]);

  const file = formData.get("file") as File | null;
  if (!file) return { sheets: {}, lookups: {}, error: "No file uploaded." };

  let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>>;
  try {
    workbook = await loadWorkbookFromFile(file);
  } catch {
    return { sheets: {}, lookups: {}, error: "Unable to read file. Make sure it is a valid .xlsx file." };
  }

  const report: ImportReport = { sheets: {}, lookups: {} };

  try {

  const plantKeyWs = findSheetStrict(workbook, ["Plant KEY", "Plant Key", "PLANT KEY"]);
  if (plantKeyWs) {
    await parsePlantKey(plantKeyWs, businessContext, report.lookups);
  }

  const productKeyWs = findSheetStrict(workbook, ["Product KEY", "Product Key", "PRODUCT KEY"]);
  if (productKeyWs) {
    await parseProductKey(productKeyWs, businessContext, report.lookups);
  }

  const transplantKeyWs = findSheetStrict(workbook, ["Transplant KEY", "Transplant Key", "TRANSPLANT KEY"]);
  if (transplantKeyWs) {
    await parseTransplantKey(transplantKeyWs, businessContext, report.lookups);
  }

  const treatmentKeyWs = findSheetStrict(workbook, ["Treatment KEY", "Treatment Key", "TREATMENT KEY"]);
  if (treatmentKeyWs) {
    await parseTreatmentKey(treatmentKeyWs, businessContext, report.lookups);
  }

  const fertilizerKeyWs = findSheetStrict(workbook, ["Fertilizer KEY", "Fertilizer Key", "FERTILIZER KEY"]);
  if (fertilizerKeyWs) {
    await parseFertilizerKey(fertilizerKeyWs, businessContext, report.lookups);
  }

  const overheadKeyWs = findSheetStrict(workbook, ["Overhead KEY", "Overhead Key", "OVERHEAD KEY"]);
  if (overheadKeyWs) {
    await parseOverheadKey(overheadKeyWs, businessContext, report.lookups);
  }

  const skuKeyWs = findSheetStrict(workbook, ["Sku KEY", "SKU KEY", "Sku Key"]);
  if (skuKeyWs) {
    await parseSkuKey(skuKeyWs, businessContext, report.lookups);
  }

  const plantIntakeWs = findSheetStrict(workbook, [
    "PLANT Intake Coding",
    "Plant Intake Coding",
    "Plant Intake",
    "PLANT Intake",
  ]);
  if (plantIntakeWs) {
    report.sheets["Plant Intake"] = await importPlantIntake(
      plantIntakeWs,
      businessContext
    );
  } else {
    report.sheets["Plant Intake"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const productIntakeWs = findSheetStrict(workbook, [
    "PRODUCT Intake Coding",
    "Product Intake Coding",
    "Product Intake",
  ]);
  if (productIntakeWs) {
    report.sheets["Product Intake"] = await importProductIntake(
      productIntakeWs,
      businessContext
    );
  } else {
    report.sheets["Product Intake"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const salesWs = findSheetStrict(workbook, ["Sales"]);
  if (salesWs) {
    const salesResult = await importSales(salesWs, businessContext);
    const { salesChannelLookup, ...sheetResult } = salesResult;
    report.sheets["Sales"] = sheetResult;
    report.lookups["Sales Channels"] = salesChannelLookup;
  } else {
    report.sheets["Sales"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const overheadWs = findSheetStrict(workbook, ["Overhead Expenses", "Overhead"]);
  if (overheadWs) {
    report.sheets["Overhead Expenses"] = await importOverheadExpenses(
      overheadWs,
      businessContext
    );
  } else {
    report.sheets["Overhead Expenses"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const transplantWs = findSheetStrict(workbook, ["Transplant Log"]);
  if (transplantWs) {
    report.sheets["Transplant Log"] = await importTransplantLog(
      transplantWs,
      businessContext
    );
  } else {
    report.sheets["Transplant Log"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const fertilizerWs = findSheetStrict(workbook, ["Fertilizer Log"]);
  if (fertilizerWs) {
    report.sheets["Fertilizer Log"] = await importFertilizerLog(
      fertilizerWs,
      businessContext
    );
  } else {
    report.sheets["Fertilizer Log"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const treatmentWs = findSheetStrict(workbook, ["Treatment Tracker", "Treatment Tracking"]);
  if (treatmentWs) {
    report.sheets["Treatment Tracker"] = await importTreatmentTracking(
      treatmentWs,
      businessContext
    );
  } else {
    report.sheets["Treatment Tracker"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  revalidateImportedDataPaths(businessSlug);

  return report;
  } catch (error) {
    return { ...report, error: appLogicFailureMessage(error) };
  }
}

export type ClearResult = {
  ok: boolean;
  counts?: Record<string, number>;
  error?: string;
};

export async function clearBusinessData(businessSlug: string): Promise<ClearResult> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const sales = createSalesRepository(businessContext);
  const plantIntakes = createPlantIntakeRepository(businessContext);
  const productIntakes = createProductIntakeRepository(businessContext);
  const fertilizerLogs = createFertilizerLogRepository(businessContext);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);
  const pricingEntries = createPricingEntryRepository(businessContext);
  const treatments = createTreatmentTrackingRepository(businessContext);
  const transplants = createTransplantLogRepository(businessContext);
  const lookupEntries = createLookupEntryRepository(businessContext);

  const [
    plantIntake,
    productIntake,
    salesEntry,
    pricingEntry,
    overheadExpense,
    transplantLog,
    fertilizerLog,
    treatmentTracking,
    lookupEntry,
  ] = await Promise.all([
    plantIntakes.deleteAll(),
    productIntakes.deleteAll(),
    sales.deleteAll(),
    pricingEntries.deleteAll(),
    overheadExpenses.deleteAll(),
    transplants.deleteAll(),
    fertilizerLogs.deleteAll(),
    treatments.deleteAll(),
    lookupEntries.deleteAll(),
  ]);

  revalidateImportedDataPaths(businessSlug);

  return {
    ok: true,
    counts: {
      "Plant Intake": plantIntake.count,
      "Product Intake": productIntake.count,
      "Sales": salesEntry.count,
      "Pricing": pricingEntry.count,
      "Overhead Expenses": overheadExpense.count,
      "Transplant Log": transplantLog.count,
      "Fertilizer Log": fertilizerLog.count,
      "Treatment Tracker": treatmentTracking.count,
      "Reference Data": lookupEntry.count,
    },
  };
}
