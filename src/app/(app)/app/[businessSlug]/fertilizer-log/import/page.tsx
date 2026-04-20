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

export default async function FertilizerLogImportPage({
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
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "No file uploaded."
        )}`
      );
    }

    let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>> | null = null;
    try {
      workbook = await loadWorkbookFromFile(file);
    } catch {
      redirect(
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "Unable to read XLSX. Make sure it's a valid Excel file."
        )}`
      );
    }

    if (!workbook) {
      redirect(
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "Workbook could not be loaded."
        )}`
      );
    }

    const ws = findWorksheetByName(workbook, ["Fertilizer Log"]);
    if (!ws) {
      redirect(
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "Workbook has no worksheets."
        )}`
      );
    }

    const headerRow = findHeaderRow(ws, ["Date", "Plant SKU"]);
    if (!headerRow) {
      redirect(
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "Could not find header row. Expected columns like Date and Plant SKU."
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
    const cPlantSku = col("Plant SKU");
    const cPotSku = col("Pot SKU");
    const cProduct = col("Product");
    const cMethod = col("Method");
    const cRate = col("Rate");
    const cUnit = col("Unit");
    const cNextEarliest = col("Next Earliest");
    const cNextLatest = col("Next Latest");
    const cNotes = col("Notes");
    const cExternal = col("UID");

    if (!cDate || !cPlantSku) {
      redirect(
        `/app/${businessSlug}/fertilizer-log/import?error=${encodeURIComponent(
          "Missing required columns. Expected at least: Date, Plant SKU."
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
        const rows = await db.fertilizerLog.findMany({
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
    type FertilizerCreateManyData = NonNullable<Parameters<typeof db.fertilizerLog.createMany>[0]>["data"];
type FertilizerCreateItem = Extract<FertilizerCreateManyData, unknown[]> extends (infer U)[] ? U : never;
const toCreate: FertilizerCreateItem[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;

      const date = cDate ? parseDate(row.getCell(cDate).value) : null;
      const plantSku = cPlantSku
        ? toStringCell(row.getCell(cPlantSku).value)
        : "";

      if (!date || !plantSku) {
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
        const key = `${plantSku}|${dateKey}`;
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
        plantSku,
        potSku: cPotSku ? toStringCell(row.getCell(cPotSku).value) || null : null,
        product: cProduct
          ? toStringCell(row.getCell(cProduct).value) || null
          : null,
        method: cMethod ? toStringCell(row.getCell(cMethod).value) || null : null,
        rate: cRate ? toStringCell(row.getCell(cRate).value) || null : null,
        unit: cUnit ? toStringCell(row.getCell(cUnit).value) || null : null,
        nextEarliest: cNextEarliest
          ? parseDate(row.getCell(cNextEarliest).value)
          : null,
        nextLatest: cNextLatest
          ? parseDate(row.getCell(cNextLatest).value)
          : null,
        notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
        externalUid,
      });
    });

    for (const part of chunk(toCreate, 1000)) {
      const res = await db.fertilizerLog.createMany({
        data: part,
        skipDuplicates: true,
      });
      inserted += res.count;
    }

    redirect(
      `/app/${businessSlug}/fertilizer-log/import?inserted=${inserted}&skippedMissing=${skippedMissing}&skippedDuplicates=${skippedDuplicates}`
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
