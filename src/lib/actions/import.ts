"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import {
  loadOverheadDerivedCalculator,
  loadProductIntakeDerivedCalculator,
  loadSalesDerivedCalculator,
} from "@/lib/app-logic-engine";
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
} from "@/lib/import/xlsx";
import type ExcelJS from "exceljs";


function findSheetStrict(
  workbook: ExcelJS.Workbook,
  candidates: string[]
): ExcelJS.Worksheet | null {
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
  businessId: string,
  table: string,
  entries: NameCode[]
): Promise<LookupResult> {
  if (!entries.length) return { added: 0, alreadyExisted: 0 };


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
    businessId,
    table,
    name: e.name,
    code: e.code,
    parentCode: null,
    sortOrder: 0,
  }));

  let added = 0;
  for (const part of chunk(data, 500)) {
    const res = await db.lookupEntry.createMany({
      data: part,
      skipDuplicates: true,
    });
    added += res.count;
  }

  return { added, alreadyExisted: deduped.length - added };
}


function readColumnPairs(
  ws: ExcelJS.Worksheet,
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
  ws: ExcelJS.Worksheet,
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
  ws: ExcelJS.Worksheet,
  businessId: string,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Plant Sources"] = await seedLookup(
    businessId, "plantSource", readColumnPairs(ws, 1, 2, HEADER_ROW)
  );
  lookups["Genera"] = await seedLookup(
    businessId, "genus", readColumnPairs(ws, 3, 4, HEADER_ROW)
  );
  lookups["Cultivars"] = await seedLookup(
    businessId, "cultivar", readColumnPairs(ws, 5, 6, HEADER_ROW)
  );


  const idNames = readColumnNames(ws, 8, HEADER_ROW);
  const plantIds = [...new Set(idNames)].filter(Boolean).map((n) => ({
    name: n,
    code: n.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 10) || n.slice(0, 10),
  }));
  lookups["Plant IDs"] = await seedLookup(businessId, "plantId", plantIds);


  lookups["Payment Methods"] = await seedLookup(
    businessId, "paymentMethod", namesToNameCode(readColumnNames(ws, 9, HEADER_ROW))
  );
}


async function parseProductKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Product Sources"] = await seedLookup(
    businessId, "productSource", readColumnPairs(ws, 2, 3, HEADER_ROW)
  );
  lookups["Product Categories"] = await seedLookup(
    businessId, "productCategory", readColumnPairs(ws, 4, 5, HEADER_ROW)
  );
  lookups["Product Sizes"] = await seedLookup(
    businessId, "productSize", readColumnPairs(ws, 6, 7, HEADER_ROW)
  );
  lookups["Product Styles"] = await seedLookup(
    businessId, "productStyle", readColumnPairs(ws, 8, 9, HEADER_ROW)
  );
}


async function parseTransplantKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
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
    lookups["Transplant Media"] = await seedLookup(businessId, "transplantMedia", toNameCode(media));
  }
  if (cAction) {
    lookups["Transplant Actions"] = await seedLookup(businessId, "transplantAction", toNameCode(actions));
  }
  if (cFromPot || cToPot) {
    lookups["Pot Sizes"] = await seedLookup(businessId, "potSize", toNameCode(potSizes));
  }
}


async function parseTreatmentKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
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

  lookups["Treatment Products"] = await seedLookup(businessId, "treatmentProduct", entries);
}


async function parseFertilizerKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
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

  lookups["Fertilizer Products"] = await seedLookup(businessId, "fertilizerProduct", entries);
}


async function parseOverheadKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Expense Vendors"] = await seedLookup(
    businessId, "expenseVendor", namesToNameCode(readColumnNames(ws, 2, HEADER_ROW))
  );
  lookups["Expense Categories"] = await seedLookup(
    businessId, "expenseCategory", namesToNameCode(readColumnNames(ws, 4, HEADER_ROW))
  );


  const pmtResult = await seedLookup(
    businessId, "paymentMethod", namesToNameCode(readColumnNames(ws, 6, HEADER_ROW))
  );
  lookups["Payment Methods"] = addResults(
    lookups["Payment Methods"] ?? { added: 0, alreadyExisted: 0 },
    pmtResult
  );
}


async function parseSkuKey(
  ws: ExcelJS.Worksheet,
  businessId: string,
  lookups: Record<string, LookupResult>
): Promise<void> {
  const HEADER_ROW = 1;

  lookups["Plant Sources"] = addResults(
    lookups["Plant Sources"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(businessId, "plantSource", readColumnPairs(ws, 1, 2, HEADER_ROW))
  );
  lookups["Genera"] = addResults(
    lookups["Genera"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(businessId, "genus", readColumnPairs(ws, 3, 4, HEADER_ROW))
  );
  lookups["Cultivars"] = addResults(
    lookups["Cultivars"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(businessId, "cultivar", readColumnPairs(ws, 5, 6, HEADER_ROW))
  );


  const idNames = readColumnNames(ws, 7, HEADER_ROW);
  const plantIds = [...new Set(idNames)].filter(Boolean).map((n) => ({
    name: n,
    code: n.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 10) || n.slice(0, 10),
  }));
  lookups["Plant IDs"] = addResults(
    lookups["Plant IDs"] ?? { added: 0, alreadyExisted: 0 },
    await seedLookup(businessId, "plantId", plantIds)
  );


  lookups["Origins"] = await seedLookup(
    businessId, "origin", readColumnPairs(ws, 9, 10, HEADER_ROW)
  );


  lookups["Statuses"] = await seedLookup(
    businessId, "status", readColumnPairs(ws, 12, 13, HEADER_ROW)
  );


  lookups["Environments"] = await seedLookup(
    businessId, "environment", readColumnPairs(ws, 15, 16, HEADER_ROW)
  );
}


function last4FromCell(value: unknown): string | null {
  const digits = toStringCell(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 4 ? digits : digits.slice(-4);
}

async function importPlantIntake(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cCost = col("Total Cost", "Cost");
  const cLocation = col("Location");
  const cStatus = col("Status");
  const cExternal = col("Unique ID", "UniqueID", "External UID", "ExternalUid");
  const cMsrp = col("MSRP");
  const cQty = col("QTY", "Qty", "Quantity");
  const cPot = col("Pot Type", "PotType");

  if (!cSku || !cSource || !cGenus || !cCultivar) {
    return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }


  const externalUids: string[] = [];
  const skus: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (sku) skus.push(sku);
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  const existingSku = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.plantIntake.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }
  for (const part of chunk([...new Set(skus)], 1000)) {
    const rows = await db.plantIntake.findMany({
      where: { businessId, sku: { in: part } },
      select: { sku: true },
    });
    for (const r of rows) existingSku.add(r.sku);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenSku = new Set<string>();

  type T = NonNullable<Parameters<typeof db.plantIntake.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const source = cSource ? toStringCell(row.getCell(cSource).value) : "";
    const genus = cGenus ? toStringCell(row.getCell(cGenus).value) : "";
    const cultivar = cCultivar ? toStringCell(row.getCell(cCultivar).value) : "";
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";

    if (!source || !genus || !cultivar || !sku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      if (existingSku.has(sku) || seenSku.has(sku)) { skippedDuplicates++; return; }
      seenSku.add(sku);
    }

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const costCents = cCost ? parseCurrencyToCents(row.getCell(cCost).value) : 0;
    const msrpCents = cMsrp ? parseCurrencyToCents(row.getCell(cMsrp).value) : 0;

    toCreate.push({
      businessId,
      date: cDate ? parseDate(row.getCell(cDate).value) : null,
      source, genus, cultivar, sku,
      locationCode: cId ? toStringCell(row.getCell(cId).value) || null : null,
      qty: qty > 0 ? qty : 1,
      costCents: costCents >= 0 ? costCents : 0,
      msrpCents: msrpCents >= 0 ? msrpCents : 0,
      potType: cPot ? toStringCell(row.getCell(cPot).value) || null : null,
      paymentMethod: null, cardLast4: null,
      location: cLocation ? toStringCell(row.getCell(cLocation).value) || null : null,
      status: col("Status") ? toStringCell(row.getCell(col("Status")!).value) || null : null,
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.plantIntake.createMany({ data: part });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importProductIntake(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cExternal = col("Unique ID", "UID");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.productIntake.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();

  type T = NonNullable<Parameters<typeof db.productIntake.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];
  const calculateProductIntake = await loadProductIntakeDerivedCalculator(
    businessId
  );

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (!date || !sku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const key = `${sku}|${date.toISOString().slice(0, 10)}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const importedUnitCostCents = cUnitCost
      ? parseCurrencyToCents(row.getCell(cUnitCost).value)
      : 0;
    const totalCostCents = cTotalCost
      ? parseCurrencyToCents(row.getCell(cTotalCost).value)
      : importedUnitCostCents * qty;
    const { unitCostCents } = calculateProductIntake({
      totalCostCents,
      qty,
    });

    toCreate.push({
      businessId, date, sku,
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
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.productIntake.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

type SalesResult = SheetResult & { salesChannelLookup: LookupResult };

async function importSales(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SalesResult> {
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
  const cItemName = col("Item Name");
  const cQty = col("Qty");
  const cSalePrice = col("Sale Price");
  const cCost = col("Cost");
  const cPayment = col("Payment Method");
  const cCard = col("Card #");
  const cChannel = col("Sale Channel");
  const cNotes = col("Notes");
  const cExternal = col("Sale ID");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true, salesChannelLookup: emptyLookup };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.salesEntry.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();
  const channelNames = new Set<string>();

  type T = NonNullable<Parameters<typeof db.salesEntry.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];
  const calculateSales = await loadSalesDerivedCalculator(businessId);

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (!date || !sku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const key = `${sku}|${date.toISOString().slice(0, 10)}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

    const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
    const salePriceCents = cSalePrice ? parseCurrencyToCents(row.getCell(cSalePrice).value) : 0;
    const costCents = cCost ? parseCurrencyToCents(row.getCell(cCost).value) : 0;
    const derived = calculateSales({ qty, salePriceCents, costCents });

    const channelVal = cChannel ? toStringCell(row.getCell(cChannel).value).trim() : "";
    if (channelVal) channelNames.add(channelVal);

    toCreate.push({
      businessId, date, sku,
      itemName: cItemName ? toStringCell(row.getCell(cItemName).value) || null : null,
      qty, salePriceCents,
      totalSaleCents: derived.totalSaleCents,
      paymentMethod: cPayment ? toStringCell(row.getCell(cPayment).value) || null : null,
      cardLast4: cCard ? last4FromCell(row.getCell(cCard).value) : null,
      channel: channelVal || null,
      costCents, profitCents: derived.profitCents, marginPct: derived.marginPct,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.salesEntry.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  const salesChannelLookup = await seedLookup(
    businessId, "salesChannel", namesToNameCode([...channelNames])
  );

  return { inserted, skippedMissing, skippedDuplicates, salesChannelLookup };
}

async function importOverheadExpenses(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cExternal = col("U ID", "UID");

  if (!cDate) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.overheadExpense.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();

  type T = NonNullable<Parameters<typeof db.overheadExpense.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];
  const calculateOverhead = await loadOverheadDerivedCalculator(businessId);

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const vendor = cVendor ? toStringCell(row.getCell(cVendor).value) || null : null;
    const importedTotalCents = cTotal ? parseCurrencyToCents(row.getCell(cTotal).value) : 0;

    if (!date || (!vendor && importedTotalCents === 0)) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const invoiceNumber = cInvoice ? toStringCell(row.getCell(cInvoice).value) || "" : "";
      const key = `${invoiceNumber}|${date.toISOString().slice(0, 10)}|${importedTotalCents}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

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
    const { unitCostCents, totalCents } = calculateOverhead({
      subTotalCents,
      shippingCents,
      discountCents,
      qty,
    });

    toCreate.push({
      businessId, date, vendor,
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
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.overheadExpense.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importTransplantLog(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cExternal = col("U ID", "UID");
  const cCreatedAt = col("Created At");

  if (!cDate || !cOriginalSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.transplantLog.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();

  type T = NonNullable<Parameters<typeof db.transplantLog.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const originalSku = cOriginalSku ? toStringCell(row.getCell(cOriginalSku).value) : "";
    if (!date || !originalSku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const key = `${originalSku}|${date.toISOString().slice(0, 10)}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

    toCreate.push({
      businessId, date, originalSku,
      action: cAction ? toStringCell(row.getCell(cAction).value) || null : null,
      media: cMedia ? toStringCell(row.getCell(cMedia).value) || null : null,
      fromPot: cFromPot ? toStringCell(row.getCell(cFromPot).value) || null : null,
      toPot: cToPot ? toStringCell(row.getCell(cToPot).value) || null : null,
      idCode: cId ? toStringCell(row.getCell(cId).value) || null : null,
      divisionSku: cDivisionSku ? toStringCell(row.getCell(cDivisionSku).value) || null : null,
      costCents: cPer ? parseCurrencyToCents(row.getCell(cPer).value) : 0,
      potColor: cPotColor ? toStringCell(row.getCell(cPotColor).value) || null : null,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
      externalUid,
      createdAtSource: cCreatedAt ? parseDate(row.getCell(cCreatedAt).value) : null,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.transplantLog.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importFertilizerLog(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cExternal = col("UID", "U ID");

  if (!cDate || !cPlantSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.fertilizerLog.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();

  type T = NonNullable<Parameters<typeof db.fertilizerLog.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const plantSku = cPlantSku ? toStringCell(row.getCell(cPlantSku).value) : "";
    if (!date || !plantSku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const key = `${plantSku}|${date.toISOString().slice(0, 10)}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

    toCreate.push({
      businessId, date, plantSku,
      potSku: cPotSku ? toStringCell(row.getCell(cPotSku).value) || null : null,
      product: cProduct ? toStringCell(row.getCell(cProduct).value) || null : null,
      method: cMethod ? toStringCell(row.getCell(cMethod).value) || null : null,
      rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
      unit: cUnit ? toStringCell(row.getCell(cUnit).value) || null : null,
      nextEarliest: cNextEarliest ? parseDate(row.getCell(cNextEarliest).value) : null,
      nextLatest: cNextLatest ? parseDate(row.getCell(cNextLatest).value) : null,
      notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.fertilizerLog.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

async function importTreatmentTracking(
  ws: ExcelJS.Worksheet,
  businessId: string
): Promise<SheetResult> {
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
  const cNextEarliest = col("Next Earliest");
  const cNextLatest = col("Next Latest");
  const cExternal = col("U ID", "UID");

  if (!cDate || !cSku) return { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };

  const externalUids: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    if (cExternal) {
      const ext = toStringCell(row.getCell(cExternal).value);
      if (ext) externalUids.push(ext);
    }
  });

  const existingExt = new Set<string>();
  for (const part of chunk([...new Set(externalUids)], 1000)) {
    const rows = await db.treatmentTracking.findMany({
      where: { businessId, externalUid: { in: part } },
      select: { externalUid: true },
    });
    for (const r of rows) if (r.externalUid) existingExt.add(r.externalUid);
  }

  let inserted = 0, skippedMissing = 0, skippedDuplicates = 0;
  const seenExt = new Set<string>();
  const seenComposite = new Set<string>();

  type T = NonNullable<Parameters<typeof db.treatmentTracking.createMany>[0]>["data"];
  type Item = Extract<T, unknown[]> extends (infer U)[] ? U : never;
  const toCreate: Item[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const date = cDate ? parseDate(row.getCell(cDate).value) : null;
    const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";
    if (!date || !sku) { skippedMissing++; return; }

    const externalUid = cExternal ? toStringCell(row.getCell(cExternal).value) || null : null;

    if (externalUid) {
      if (existingExt.has(externalUid) || seenExt.has(externalUid)) { skippedDuplicates++; return; }
      seenExt.add(externalUid);
    } else {
      const key = `${sku}|${date.toISOString().slice(0, 10)}`;
      if (seenComposite.has(key)) { skippedDuplicates++; return; }
      seenComposite.add(key);
    }

    toCreate.push({
      businessId, date, sku,
      target: cTarget ? toStringCell(row.getCell(cTarget).value) || null : null,
      product: cProduct ? toStringCell(row.getCell(cProduct).value) || null : null,
      activeIngredient: cActive ? toStringCell(row.getCell(cActive).value) || null : null,
      epaNumber: cEpa ? toStringCell(row.getCell(cEpa).value) || null : null,
      rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
      potSize: cPot ? toStringCell(row.getCell(cPot).value) || null : null,
      method: cMethod ? toStringCell(row.getCell(cMethod).value) || null : null,
      initials: cInit ? toStringCell(row.getCell(cInit).value) || null : null,
      nextEarliest: cNextEarliest ? parseDate(row.getCell(cNextEarliest).value) : null,
      nextLatest: cNextLatest ? parseDate(row.getCell(cNextLatest).value) : null,
      externalUid,
    });
  });

  for (const part of chunk(toCreate, 1000)) {
    const res = await db.treatmentTracking.createMany({ data: part, skipDuplicates: true });
    inserted += res.count;
  }

  return { inserted, skippedMissing, skippedDuplicates };
}

export async function importWorkbook(
  businessSlug: string,
  formData: FormData
): Promise<ImportReport> {
  const { profile } = await requireRole(["OWNER", "MANAGER"]);
  const businessId = profile.activeBusinessId;
  if (!businessId) return { sheets: {}, lookups: {}, error: "No active business." };

  const file = formData.get("file") as File | null;
  if (!file) return { sheets: {}, lookups: {}, error: "No file uploaded." };

  let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>>;
  try {
    workbook = await loadWorkbookFromFile(file);
  } catch {
    return { sheets: {}, lookups: {}, error: "Unable to read file. Make sure it is a valid .xlsx file." };
  }

  const report: ImportReport = { sheets: {}, lookups: {} };

  const plantKeyWs = findSheetStrict(workbook, ["Plant KEY", "Plant Key", "PLANT KEY"]);
  if (plantKeyWs) {
    await parsePlantKey(plantKeyWs, businessId, report.lookups);
  }

  const productKeyWs = findSheetStrict(workbook, ["Product KEY", "Product Key", "PRODUCT KEY"]);
  if (productKeyWs) {
    await parseProductKey(productKeyWs, businessId, report.lookups);
  }

  const transplantKeyWs = findSheetStrict(workbook, ["Transplant KEY", "Transplant Key", "TRANSPLANT KEY"]);
  if (transplantKeyWs) {
    await parseTransplantKey(transplantKeyWs, businessId, report.lookups);
  }

  const treatmentKeyWs = findSheetStrict(workbook, ["Treatment KEY", "Treatment Key", "TREATMENT KEY"]);
  if (treatmentKeyWs) {
    await parseTreatmentKey(treatmentKeyWs, businessId, report.lookups);
  }

  const fertilizerKeyWs = findSheetStrict(workbook, ["Fertilizer KEY", "Fertilizer Key", "FERTILIZER KEY"]);
  if (fertilizerKeyWs) {
    await parseFertilizerKey(fertilizerKeyWs, businessId, report.lookups);
  }

  const overheadKeyWs = findSheetStrict(workbook, ["Overhead KEY", "Overhead Key", "OVERHEAD KEY"]);
  if (overheadKeyWs) {
    await parseOverheadKey(overheadKeyWs, businessId, report.lookups);
  }

  const skuKeyWs = findSheetStrict(workbook, ["Sku KEY", "SKU KEY", "Sku Key"]);
  if (skuKeyWs) {
    await parseSkuKey(skuKeyWs, businessId, report.lookups);
  }

  const plantIntakeWs = findSheetStrict(workbook, [
    "PLANT Intake Coding",
    "Plant Intake Coding",
    "Plant Intake",
    "PLANT Intake",
  ]);
  if (plantIntakeWs) {
    report.sheets["Plant Intake"] = await importPlantIntake(plantIntakeWs, businessId);
  } else {
    report.sheets["Plant Intake"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const productIntakeWs = findSheetStrict(workbook, [
    "PRODUCT Intake Coding",
    "Product Intake Coding",
    "Product Intake",
  ]);
  if (productIntakeWs) {
    report.sheets["Product Intake"] = await importProductIntake(productIntakeWs, businessId);
  } else {
    report.sheets["Product Intake"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const salesWs = findSheetStrict(workbook, ["Sales"]);
  if (salesWs) {
    const salesResult = await importSales(salesWs, businessId);
    const { salesChannelLookup, ...sheetResult } = salesResult;
    report.sheets["Sales"] = sheetResult;
    report.lookups["Sales Channels"] = salesChannelLookup;
  } else {
    report.sheets["Sales"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const overheadWs = findSheetStrict(workbook, ["Overhead Expenses", "Overhead"]);
  if (overheadWs) {
    report.sheets["Overhead Expenses"] = await importOverheadExpenses(overheadWs, businessId);
  } else {
    report.sheets["Overhead Expenses"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const transplantWs = findSheetStrict(workbook, ["Transplant Log"]);
  if (transplantWs) {
    report.sheets["Transplant Log"] = await importTransplantLog(transplantWs, businessId);
  } else {
    report.sheets["Transplant Log"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const fertilizerWs = findSheetStrict(workbook, ["Fertilizer Log"]);
  if (fertilizerWs) {
    report.sheets["Fertilizer Log"] = await importFertilizerLog(fertilizerWs, businessId);
  } else {
    report.sheets["Fertilizer Log"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  const treatmentWs = findSheetStrict(workbook, ["Treatment Tracker", "Treatment Tracking"]);
  if (treatmentWs) {
    report.sheets["Treatment Tracker"] = await importTreatmentTracking(treatmentWs, businessId);
  } else {
    report.sheets["Treatment Tracker"] = { inserted: 0, skippedMissing: 0, skippedDuplicates: 0, notFound: true };
  }

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  revalidatePath(`/app/${businessSlug}/plant-intake`);
  revalidatePath(`/app/${businessSlug}/product-intake`);
  revalidatePath(`/app/${businessSlug}/sales`);
  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  revalidatePath(`/app/${businessSlug}/transplant-log`);
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  revalidatePath(`/app/${businessSlug}/treatment-tracking`);

  return report;
}

export type ClearResult = {
  ok: boolean;
  counts?: Record<string, number>;
  error?: string;
};

export async function clearBusinessData(businessSlug: string): Promise<ClearResult> {
  const { profile } = await requireRole(["OWNER"]);
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No active business." };

  const [
    plantIntake,
    productIntake,
    salesEntry,
    overheadExpense,
    transplantLog,
    fertilizerLog,
    treatmentTracking,
    lookupEntry,
  ] = await Promise.all([
    db.plantIntake.deleteMany({ where: { businessId } }),
    db.productIntake.deleteMany({ where: { businessId } }),
    db.salesEntry.deleteMany({ where: { businessId } }),
    db.overheadExpense.deleteMany({ where: { businessId } }),
    db.transplantLog.deleteMany({ where: { businessId } }),
    db.fertilizerLog.deleteMany({ where: { businessId } }),
    db.treatmentTracking.deleteMany({ where: { businessId } }),
    db.lookupEntry.deleteMany({ where: { businessId } }),
  ]);

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  revalidatePath(`/app/${businessSlug}/plant-intake`);
  revalidatePath(`/app/${businessSlug}/product-intake`);
  revalidatePath(`/app/${businessSlug}/sales`);
  revalidatePath(`/app/${businessSlug}/overhead-expenses`);
  revalidatePath(`/app/${businessSlug}/transplant-log`);
  revalidatePath(`/app/${businessSlug}/fertilizer-log`);
  revalidatePath(`/app/${businessSlug}/treatment-tracking`);

  return {
    ok: true,
    counts: {
      "Plant Intake": plantIntake.count,
      "Product Intake": productIntake.count,
      "Sales": salesEntry.count,
      "Overhead Expenses": overheadExpense.count,
      "Transplant Log": transplantLog.count,
      "Fertilizer Log": fertilizerLog.count,
      "Treatment Tracker": treatmentTracking.count,
      "Lookup Entries": lookupEntry.count,
    },
  };
}
