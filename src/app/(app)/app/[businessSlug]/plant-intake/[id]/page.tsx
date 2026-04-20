import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActiveMembership } from "@/lib/authz";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);

const formatDate = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : "-";

export default async function PlantIntakeDetailsPage({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}) {
  const resolvedParams = await params;
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId ?? "";

  const record = await db.plantIntake.findFirst({
    where: { id: resolvedParams.id, businessId },
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plant Intake</h1>
        <p className="text-sm text-gray-600">Details for {record.id}</p>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-gray-500">Date</dt>
            <dd className="font-medium text-gray-900">{formatDate(record.date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Source</dt>
            <dd className="font-medium text-gray-900">{record.source}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Genus</dt>
            <dd className="font-medium text-gray-900">{record.genus}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Cultivar</dt>
            <dd className="font-medium text-gray-900">{record.cultivar}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">ID #</dt>
            <dd className="font-medium text-gray-900">
              {record.locationCode ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">SKU</dt>
            <dd className="font-medium text-gray-900">{record.sku}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Qty</dt>
            <dd className="font-medium text-gray-900">{record.qty}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Cost</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(record.costCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">MSRP</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(record.msrpCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Pot Type</dt>
            <dd className="font-medium text-gray-900">
              {record.potType ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Payment Method</dt>
            <dd className="font-medium text-gray-900">
              {record.paymentMethod ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Card</dt>
            <dd className="font-medium text-gray-900">
              {record.cardLast4 ? `**** ${record.cardLast4}` : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Location</dt>
            <dd className="font-medium text-gray-900">
              {record.location ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">
              {record.status ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">External UID</dt>
            <dd className="font-medium text-gray-900">
              {record.externalUid ?? "-"}
            </dd>
          </div>
        </dl>
      </div>

      <Link
        href={`/app/${resolvedParams.businessSlug}/plant-intake`}
        className="text-sm font-medium text-green-700 hover:text-green-800"
      >
        Back to Plant Intake
      </Link>
    </div>
  );
}
