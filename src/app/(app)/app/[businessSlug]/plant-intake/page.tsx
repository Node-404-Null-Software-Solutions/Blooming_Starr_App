import Link from "next/link";
import { requireBusinessMembership } from "@/lib/authz";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import { plantIntakeTotalCostCents } from "@/lib/plant-intake-cost";
import { recordPhotoUrl } from "@/lib/record-photo";
import { sortByDateDescNullsLast } from "@/lib/sort";
import PlantIntakeClient from "./PlantIntakeClient";
import { CanManageOperations } from "@/components/permissions/BusinessPermissions";

export default async function PlantIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {

  const { businessSlug } = await params;
  const sp = (await searchParams) ?? {};

  const { businessContext } = await requireBusinessMembership(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);

  const priceTypeRaw = typeof sp.priceType === "string" ? sp.priceType : "";
  const priceType =
    priceTypeRaw === "msrp" || priceTypeRaw === "cost" ? priceTypeRaw : "";
  const minPriceRaw = typeof sp.minPrice === "string" ? sp.minPrice : "";
  const maxPriceRaw = typeof sp.maxPrice === "string" ? sp.maxPrice : "";
  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const genusRaw = typeof sp.genus === "string" ? sp.genus.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";

  const minPrice = Number.parseFloat(minPriceRaw);
  const maxPrice = Number.parseFloat(maxPriceRaw);
  const minPriceCents = Number.isFinite(minPrice)
    ? Math.round(minPrice * 100)
    : null;
  const maxPriceCents = Number.isFinite(maxPrice)
    ? Math.round(maxPrice * 100)
    : null;

  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFromDate =
    fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validToDate =
    toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;

  const dateFilter =
    validFromDate || validToDate
      ? {
          gte: validFromDate ?? undefined,
          lte: validToDate ?? undefined,
        }
      : undefined;

  const priceFilter =
    priceType && (minPriceCents !== null || maxPriceCents !== null)
      ? {
          gte: minPriceCents ?? undefined,
          lte: maxPriceCents ?? undefined,
        }
      : undefined;

  const genusFilter = genusRaw
    ? {
        equals: genusRaw,
        mode: "insensitive" as const,
      }
    : undefined;

  const searchFilter = qRaw
    ? {
        OR: [
          { sku: { contains: qRaw, mode: "insensitive" as const } },
          { source: { contains: qRaw, mode: "insensitive" as const } },
          { genus: { contains: qRaw, mode: "insensitive" as const } },
          { cultivar: { contains: qRaw, mode: "insensitive" as const } },
          { locationCode: { contains: qRaw, mode: "insensitive" as const } },
          { potType: { contains: qRaw, mode: "insensitive" as const } },
          { paymentMethod: { contains: qRaw, mode: "insensitive" as const } },
          { cardLast4: { contains: qRaw, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const genusRows = await plantIntakes.listDistinctGenera();
  type GenusRow = (typeof genusRows)[number];
  const genusOptions = genusRows
    .map((row: GenusRow) => row.genus)
    .filter((value): value is string => Boolean(value && value.trim().length > 0));
  const lookups = await getLookupEntriesMulti(businessSlug, [
    "plantSource",
    "genus",
    "cultivar",
    "plantId",
    "paymentMethod",
  ]);

  const rawRows = await plantIntakes.list({
    ...(searchFilter ? searchFilter : {}),
    ...(genusFilter ? { genus: genusFilter } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(priceType === "msrp" && priceFilter
      ? { msrpCents: priceFilter }
      : {}),
    ...(priceType === "cost" && priceFilter
      ? { costCents: priceFilter }
      : {}),
  });
  const sortedRows = sortByDateDescNullsLast(rawRows);

  type RawRow = (typeof rawRows)[number];
  const rows = sortedRows.map((r: RawRow) => ({
    id: r.id,
    date: r.date ? r.date.toISOString().slice(0, 10) : null,
    source: r.source,
    genus: r.genus,
    cultivar: r.cultivar,
    locationCode: r.locationCode ?? null,
    sku: r.sku,
    qty: r.qty,
    costCents: r.costCents,
    totalCostCents: plantIntakeTotalCostCents(r.costCents, r.qty),
    msrpCents: r.msrpCents,
    potType: r.potType ?? null,
    paymentMethod: r.paymentMethod ?? null,
    cardLast4: r.cardLast4 ?? null,
    photoUrl:
      r.photoContentType && r.photoUpdatedAt
        ? recordPhotoUrl(businessSlug, "plant-intake", r.id, r.photoUpdatedAt)
        : null,
  }));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      {rows.length === 0 ? (
        <>
          <PlantIntakeClient
            businessSlug={businessSlug}
            genusOptions={genusOptions}
            lookups={lookups}
            rows={rows}
          />
          <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
            <div className="text-base font-semibold text-gray-900">
              No plant intake records yet.
            </div>
            <p className="mt-2">
              Import your Inventory Trackers workbook to populate this list.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <CanManageOperations>
                <Link
                  href={`/app/${businessSlug}/settings/import`}
                  className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Import
                </Link>
              </CanManageOperations>
            </div>
          </div>
        </>
      ) : (
        <PlantIntakeClient
          businessSlug={businessSlug}
          genusOptions={genusOptions}
          lookups={lookups}
          rows={rows}
        />
      )}
    </div>
  );
}
