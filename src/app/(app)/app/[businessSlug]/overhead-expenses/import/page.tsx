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

function last4FromCell(value: unknown): string | null {
  const digits = toStringCell(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 4 ? digits : digits.slice(-4);
}

export default async function OverheadExpensesImportPage({
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
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "No file uploaded."
        )}`
      );
    }

    let workbook: Awaited<ReturnType<typeof loadWorkbookFromFile>> | null = null;
    try {
      workbook = await loadWorkbookFromFile(file);
    } catch {
      redirect(
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "Unable to read XLSX. Make sure it's a valid Excel file."
        )}`
      );
    }

    if (!workbook) {
      redirect(
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "Workbook could not be loaded."
        )}`
      );
    }

    const ws = findWorksheetByName(workbook, ["Overhead Expenses"]);
    if (!ws) {
      redirect(
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "Workbook has no worksheets."
        )}`
      );
    }

    const headerRow = findHeaderRow(ws, ["Date"]);
    if (!headerRow) {
      redirect(
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "Could not find header row. Expected a Date header in the first 10 rows."
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
    const cVendor = col("Vendor");
    const cBrand = col("Brand");
    const cCategory = col("Category");
    const cDescription = col("Description");
    const cQty = col("Qty");
    const cSubTotal = col("Sub Tot");
    const cShipping = col("Ship.");
    const cDiscount = col("Disc.");
    const cUnitCost = col("Un. Cost");
    const cTotal = col("Act. Tot");
    const cPayment = col("Pmt. M.");
    const cCard = col("Card #");
    const cInvoice = col("Invoice #");
    const cNotes = col("Notes / Project");
    const cExternal = col("U ID");

    if (!cDate || (!cVendor && !cTotal)) {
      redirect(
        `/app/${businessSlug}/overhead-expenses/import?error=${encodeURIComponent(
          "Missing required columns. Expected Date and Vendor (or Date + Act. Tot)."
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
        const rows = await db.overheadExpense.findMany({
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
    type OverheadCreateManyData = NonNullable<Parameters<typeof db.overheadExpense.createMany>[0]>["data"];
type OverheadCreateItem = Extract<OverheadCreateManyData, unknown[]> extends (infer U)[] ? U : never;
const toCreate: OverheadCreateItem[] = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRow.number) return;

      const date = cDate ? parseDate(row.getCell(cDate).value) : null;
      const vendor = cVendor
        ? toStringCell(row.getCell(cVendor).value) || null
        : null;
      const totalCents = cTotal
        ? parseCurrencyToCents(row.getCell(cTotal).value)
        : 0;

      if (!date || (!vendor && totalCents === 0)) {
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
        const invoiceNumber = cInvoice
          ? toStringCell(row.getCell(cInvoice).value) || ""
          : "";
        const key = `${invoiceNumber}|${dateKey}|${totalCents}`;
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
        vendor,
        brand: cBrand ? toStringCell(row.getCell(cBrand).value) || null : null,
        category: cCategory
          ? toStringCell(row.getCell(cCategory).value) || null
          : null,
        description: cDescription
          ? toStringCell(row.getCell(cDescription).value) || null
          : null,
        qty: cQty ? parseIntSafe(row.getCell(cQty).value, 1) : 1,
        subTotalCents: cSubTotal
          ? parseCurrencyToCents(row.getCell(cSubTotal).value)
          : 0,
        shippingCents: cShipping
          ? parseCurrencyToCents(row.getCell(cShipping).value)
          : 0,
        discountCents: cDiscount
          ? parseCurrencyToCents(row.getCell(cDiscount).value)
          : 0,
        unitCostCents: cUnitCost
          ? parseCurrencyToCents(row.getCell(cUnitCost).value)
          : 0,
        totalCents,
        paymentMethod: cPayment
          ? toStringCell(row.getCell(cPayment).value) || null
          : null,
        cardLast4: cCard ? last4FromCell(row.getCell(cCard).value) : null,
        invoiceNumber: cInvoice
          ? toStringCell(row.getCell(cInvoice).value) || null
          : null,
        notes: cNotes ? toStringCell(row.getCell(cNotes).value) || null : null,
        externalUid,
      });
    });

    for (const part of chunk(toCreate, 1000)) {
      const res = await db.overheadExpense.createMany({
        data: part,
        skipDuplicates: true,
      });
      inserted += res.count;
    }

    redirect(
      `/app/${businessSlug}/overhead-expenses/import?inserted=${inserted}&skippedMissing=${skippedMissing}&skippedDuplicates=${skippedDuplicates}`
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
