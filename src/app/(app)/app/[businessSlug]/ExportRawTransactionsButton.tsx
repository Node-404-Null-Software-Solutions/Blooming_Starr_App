import { Download } from "lucide-react";

export default function ExportRawTransactionsButton({
  businessSlug,
  year,
}: {
  businessSlug: string;
  year: number;
}) {
  const href = `/api/export/${encodeURIComponent(
    businessSlug
  )}/transactions?year=${year}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <Download className="h-4 w-4" aria-hidden />
      Export transactions (CSV)
    </a>
  );
}
