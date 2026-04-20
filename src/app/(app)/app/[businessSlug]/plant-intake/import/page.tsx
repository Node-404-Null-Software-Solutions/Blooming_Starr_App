import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { FilePicker } from "@/components/import/FilePicker";
import {
  buildHeaderMap,
  chunk,
  findHeaderRow,
  findWorksheetByName,
  loadWorkbookFromFile,
  normalizeHeader,
  parseCurrencyToCents,
  parseDate,
  parseIntSafe,
  toStringCell,
} from "@/lib/import/xlsx";

export const runtime = "nodejs";

type SP = Record<string, string | string[] | undefined>;

export default async function PlantIntakeImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<SP>;
}) {
  await requireActiveMembership();

  const { businessSlug } = await params;
  const sp = (await searchParams) ?? {};

  const insertedQ = typeof sp.inserted === "string" ? sp.inserted : undefined;
  const skippedMissingQ =
    typeof sp.skippedMissing === "string" ? sp.skippedMissing : undefined;
  const skippedDuplicatesQ =
    typeof sp.skippedDuplicates === "string" ? sp.skippedDuplicates : undefined;
  const errorQ = typeof sp.error === "string" ? sp.error : undefined;

  async function importAction(formData: FormData): Promise<void> {
    "use server";

    const { profile } = await requireActiveMembership();
    const businessId = profile.activeBusinessId;
    if (!businessId) redirect("/app");

    const file = formData.get("file") as File | null;
    if (!file) {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "No file uploaded."
        )}`
      );
    }

    let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>> | null = null;
    try {
      workbook = await loadWorkbookFromFile(file);
    } catch {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "Unable to read XLSX. Make sure it's a valid Excel file."
        )}`
      );
    }

    if (!workbook) {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "Workbook could not be loaded."
        )}`
      );
    }

    const ws = findWorksheetByName(workbook, ["Plant Intake"]);

    if (!ws) {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "Workbook has no worksheets."
        )}`
      );
    }

    const headerRow = findHeaderRow(ws, ["Source", "SKU"]);

    if (!headerRow) {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "Could not find header row. Expected columns like Source and SKU."
        )}`
      );
    }

    const headerMap = buildHeaderMap(headerRow);

    // Helper to read by header label(s)
    const col = (...names: string[]) => {
      for (const n of names) {
        const c = headerMap.get(normalizeHeader(n));
        if (c) return c;
      }
      return null;
    };

    // Expected headers from your coding CSV:
    const cDate = col("Date");
    const cSource = col("Source");
    const cGenus = col("Genus");
    const cCultivar = col("Cultivar");
    const cId = col("ID #", "ID#", "ID");
    const cSku = col("SKU");
    const cCost = col("Cost");
    const cLocation = col("Location");
    const cStatus = col("Status");
    const cExternal = col("Unique ID", "UniqueID", "External UID", "ExternalUid");
    const cMsrp = col("MSRP");
    const cQty = col("QTY", "Qty", "Quantity");
    const cPot = col("Pot Type", "PotType");

    // Basic guard: if SKU / core fields missing, fail fast with a useful message
    if (!cSku || !cSource || !cGenus || !cCultivar) {
      redirect(
        `/app/${businessSlug}/plant-intake/import?error=${encodeURIComponent(
          "Missing required columns. Expected at least: Source, Genus, Cultivar, SKU (row 1 headers)."
        )}`
      );
    }

    // First pass: collect keys so we can prefetch existing records for dedupe
    const externalUids: string[] = [];
    const skus: string[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (!headerRow || rowNumber <= headerRow.number) return;

      const sku = toStringCell(row.getCell(cSku).value);
      if (sku) skus.push(sku);

      if (cExternal) {
        const ext = toStringCell(row.getCell(cExternal).value);
        if (ext) externalUids.push(ext);
      }
    });

    // Prefetch existing keys (chunk to avoid huge IN queries)
    const existingExternal = new Set<string>();
    const existingSku = new Set<string>();

    if (externalUids.length) {
      for (const part of chunk([...new Set(externalUids)], 1000)) {
        const rows = await db.plantIntake.findMany({
          where: {
            businessId,
            externalUid: { in: part },
          },
          select: { externalUid: true },
        });
        for (const r of rows) if (r.externalUid) existingExternal.add(r.externalUid);
      }
    }

    if (skus.length) {
      for (const part of chunk([...new Set(skus)], 1000)) {
        const rows = await db.plantIntake.findMany({
          where: {
            businessId,
            sku: { in: part },
          },
          select: { sku: true },
        });
        for (const r of rows) existingSku.add(r.sku);
      }
    }

    // Second pass: build createMany payload
    let inserted = 0;
    let skippedMissing = 0;
    let skippedDuplicates = 0;

    const seenExternal = new Set<string>();
    const seenSku = new Set<string>();

    type PlantIntakeCreateManyData = NonNullable<Parameters<typeof db.plantIntake.createMany>[0]>["data"];
type PlantIntakeCreateItem = Extract<PlantIntakeCreateManyData, unknown[]> extends (infer U)[] ? U : never;
const toCreate: PlantIntakeCreateItem[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (!headerRow || rowNumber <= headerRow.number) return;

      const source = toStringCell(row.getCell(cSource).value);
      const genus = toStringCell(row.getCell(cGenus).value);
      const cultivar = toStringCell(row.getCell(cCultivar).value);
      const sku = toStringCell(row.getCell(cSku).value);

      if (!source || !genus || !cultivar || !sku) {
        skippedMissing += 1;
        return;
      }

      const externalUid = cExternal
        ? toStringCell(row.getCell(cExternal).value) || null
        : null;

      // Dedupe key preference: externalUid if present else sku
      if (externalUid) {
        if (existingExternal.has(externalUid) || seenExternal.has(externalUid)) {
          skippedDuplicates += 1;
          return;
        }
      } else {
        if (existingSku.has(sku) || seenSku.has(sku)) {
          skippedDuplicates += 1;
          return;
        }
      }

      // Mark as seen in this file
      if (externalUid) seenExternal.add(externalUid);
      else seenSku.add(sku);

      // Parse optional fields
      const locationCode = cId ? toStringCell(row.getCell(cId).value) || null : null;
      const location = cLocation
        ? toStringCell(row.getCell(cLocation).value) || null
        : null;

      const status = cStatus ? toStringCell(row.getCell(cStatus).value) || null : null;

      const qty = cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1;
      const costCents = cCost
        ? parseCurrencyToCents(row.getCell(cCost).value)
        : 0;
      const msrpCents = cMsrp
        ? parseCurrencyToCents(row.getCell(cMsrp).value)
        : 0;
      const potType = cPot ? toStringCell(row.getCell(cPot).value) || null : null;

      const date = cDate ? parseDate(row.getCell(cDate).value) : null;

      toCreate.push({
        businessId,
        date: date ?? null,

        source,
        genus,
        cultivar,
        locationCode,
        sku,

        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        costCents: Number.isFinite(costCents) && costCents >= 0 ? costCents : 0,
        msrpCents: Number.isFinite(msrpCents) && msrpCents >= 0 ? msrpCents : 0,
        potType,

        paymentMethod: null,
        cardLast4: null,

        location,
        status,
        externalUid,
      });
    });

    // Insert in chunks for safety
    for (const part of chunk(toCreate, 1000)) {
      const res = await db.plantIntake.createMany({
        data: part,
      });
      inserted += res.count;
    }

    redirect(
      `/app/${businessSlug}/plant-intake/import?inserted=${inserted}&skippedMissing=${skippedMissing}&skippedDuplicates=${skippedDuplicates}`
    );
  }

  return (
    <div className="space-y-4">
      {errorQ ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          {errorQ}
        </div>
      ) : insertedQ ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
          Imported <b>{insertedQ}</b>. Skipped missing:{" "}
          <b>{skippedMissingQ ?? "0"}</b>. Skipped duplicates:{" "}
          <b>{skippedDuplicatesQ ?? "0"}</b>.
        </div>
      ) : null}

      <form action={importAction} className="flex items-center gap-3">
        <FilePicker name="file" accept=".xlsx" required />

        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2"
        >
          Import
        </button>
      </form>
    </div>
  );
}
