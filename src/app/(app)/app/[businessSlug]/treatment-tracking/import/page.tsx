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
  parseDate,
  toStringCell,
} from "@/lib/import/xlsx";

export const runtime = "nodejs";

type SP = Record<string, string | string[] | undefined>;

export default async function TreatmentTrackingImportPage({
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
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "No file uploaded."
        )}`
      );
    }

    let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>> | null = null;
    try {
      workbook = await loadWorkbookFromFile(file);
    } catch {
      redirect(
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "Unable to read XLSX. Make sure it's a valid Excel file."
        )}`
      );
    }

    if (!workbook) {
      redirect(
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "Workbook could not be loaded."
        )}`
      );
    }

    const ws = findWorksheetByName(workbook, ["Treatment Tracker"]);
    if (!ws) {
      redirect(
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "Workbook has no worksheets."
        )}`
      );
    }

    const headerRow = findHeaderRow(ws, ["Date", "SKU"]);
    if (!headerRow) {
      redirect(
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "Could not find header row. Expected columns like Date and SKU."
        )}`
      );
    }

    const headerMap = buildHeaderMap(headerRow);
    const col = (...names: string[]) => {
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
    const cActive = col("Act Ing");
    const cEpa = col("EPA #");
    const cRate = col("Rate");
    const cPot = col("Pot Sz");
    const cMethod = col("Method");
    const cInit = col("Init.");
    const cNextEarliest = col("Next Earliest");
    const cNextLatest = col("Next Latest");
    const cExternal = col("U ID");

    if (!cDate || !cSku) {
      redirect(
        `/app/${businessSlug}/treatment-tracking/import?error=${encodeURIComponent(
          "Missing required columns. Expected at least: Date, SKU."
        )}`
      );
    }

    const externalUids: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;
      if (cExternal) {
        const ext = toStringCell(row.getCell(cExternal).value);
        if (ext) externalUids.push(ext);
      }
    });

    const existingExternal = new Set<string>();
    if (externalUids.length) {
      for (const part of chunk([...new Set(externalUids)], 1000)) {
        const rows = await db.treatmentTracking.findMany({
          where: { businessId, externalUid: { in: part } },
          select: { externalUid: true },
        });
        for (const r of rows) if (r.externalUid) existingExternal.add(r.externalUid);
      }
    }

    let inserted = 0;
    let skippedMissing = 0;
    let skippedDuplicates = 0;

    const seenExternal = new Set<string>();
    const seenComposite = new Set<string>();
    type TreatmentCreateManyData = NonNullable<Parameters<typeof db.treatmentTracking.createMany>[0]>["data"];
type TreatmentCreateItem = Extract<TreatmentCreateManyData, unknown[]> extends (infer U)[] ? U : never;
const toCreate: TreatmentCreateItem[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;

      const date = cDate ? parseDate(row.getCell(cDate).value) : null;
      const sku = cSku ? toStringCell(row.getCell(cSku).value) : "";

      if (!date || !sku) {
        skippedMissing += 1;
        return;
      }

      const externalUid = cExternal
        ? toStringCell(row.getCell(cExternal).value) || null
        : null;

      if (externalUid) {
        if (existingExternal.has(externalUid) || seenExternal.has(externalUid)) {
          skippedDuplicates += 1;
          return;
        }
      } else {
        const dateKey = date.toISOString().slice(0, 10);
        const key = `${sku}|${dateKey}`;
        if (seenComposite.has(key)) {
          skippedDuplicates += 1;
          return;
        }
        seenComposite.add(key);
      }

      if (externalUid) seenExternal.add(externalUid);

      toCreate.push({
        businessId,
        date,
        sku,
        target: cTarget ? toStringCell(row.getCell(cTarget).value) || null : null,
        product: cProduct
          ? toStringCell(row.getCell(cProduct).value) || null
          : null,
        activeIngredient: cActive
          ? toStringCell(row.getCell(cActive).value) || null
          : null,
        epaNumber: cEpa ? toStringCell(row.getCell(cEpa).value) || null : null,
        rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
        potSize: cPot ? toStringCell(row.getCell(cPot).value) || null : null,
        method: cMethod ? toStringCell(row.getCell(cMethod).value) || null : null,
        initials: cInit ? toStringCell(row.getCell(cInit).value) || null : null,
        nextEarliest: cNextEarliest
          ? parseDate(row.getCell(cNextEarliest).value)
          : null,
        nextLatest: cNextLatest
          ? parseDate(row.getCell(cNextLatest).value)
          : null,
        externalUid,
      });
    });

    for (const part of chunk(toCreate, 1000)) {
      const res = await db.treatmentTracking.createMany({
        data: part,
        skipDuplicates: true,
      });
      inserted += res.count;
    }

    redirect(
      `/app/${businessSlug}/treatment-tracking/import?inserted=${inserted}&skippedMissing=${skippedMissing}&skippedDuplicates=${skippedDuplicates}`
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
