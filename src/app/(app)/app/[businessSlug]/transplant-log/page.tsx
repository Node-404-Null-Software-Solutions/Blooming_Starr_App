import { requireBusinessMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import TransplantLogClient from "./TransplantLogClient";

export default async function TransplantLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;
  const sp = (await searchParams) ?? {};

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const originalSkuRaw = typeof sp.originalSku === "string" ? sp.originalSku.trim() : "";
  const actionRaw = typeof sp.action === "string" ? sp.action.trim() : "";
  const fromPotRaw = typeof sp.fromPot === "string" ? sp.fromPot.trim() : "";
  const toPotRaw = typeof sp.toPot === "string" ? sp.toPot.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;
  const searchFilter = qRaw
    ? {
        OR: [
          { originalSku: { contains: qRaw, mode: "insensitive" as const } },
          { divisionSku: { contains: qRaw, mode: "insensitive" as const } },
          { action: { contains: qRaw, mode: "insensitive" as const } },
          { media: { contains: qRaw, mode: "insensitive" as const } },
          { fromPot: { contains: qRaw, mode: "insensitive" as const } },
          { toPot: { contains: qRaw, mode: "insensitive" as const } },
          { idCode: { contains: qRaw, mode: "insensitive" as const } },
          { potColor: { contains: qRaw, mode: "insensitive" as const } },
          { notes: { contains: qRaw, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [lookups, rows] = await Promise.all([
    getLookupEntriesMulti(businessSlug, ["transplantAction", "transplantMedia", "potSize", "potColor"]),
    db.transplantLog.findMany({
    where: {
      businessId,
      ...(searchFilter ? searchFilter : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(originalSkuRaw ? { originalSku: { contains: originalSkuRaw, mode: "insensitive" as const } } : {}),
      ...(actionRaw ? { action: { contains: actionRaw, mode: "insensitive" as const } } : {}),
      ...(fromPotRaw ? { fromPot: { contains: fromPotRaw, mode: "insensitive" as const } } : {}),
      ...(toPotRaw ? { toPot: { contains: toPotRaw, mode: "insensitive" as const } } : {}),
    },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serialized = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    originalSku: row.originalSku,
    action: row.action,
    media: row.media,
    fromPot: row.fromPot,
    toPot: row.toPot,
    idCode: row.idCode,
    divisionSku: row.divisionSku,
    costCents: row.costCents,
    potColor: row.potColor,
    notes: row.notes,
  }));

  const actionOptions = lookups.transplantAction?.map((e) => e.name) ?? [];
  const mediaOptions = lookups.transplantMedia?.map((e) => e.name) ?? [];
  const potSizeOptions = lookups.potSize?.map((e) => e.name) ?? [];
  const potColorOptions = lookups.potColor?.map((e) => e.name) ?? [];

  return (
    <TransplantLogClient
      businessSlug={businessSlug}
      rows={serialized}
      hasRows={hasRows}
      actionOptions={actionOptions}
      mediaOptions={mediaOptions}
      potSizeOptions={potSizeOptions}
      potColorOptions={potColorOptions}
    />
  );
}
