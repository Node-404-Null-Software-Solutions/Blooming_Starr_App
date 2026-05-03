"use client";

import { useState, useTransition, useRef } from "react";
import { importWorkbook, clearBusinessData } from "@/lib/actions/import";
import type { ImportReport, SheetResult, LookupResult, ClearResult } from "@/lib/actions/import";
import { Upload, CheckCircle, AlertCircle, MinusCircle, Loader2, Trash2 } from "lucide-react";

export default function ImportWorkbookClient({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [clearResult, setClearResult] = useState<ClearResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const CONFIRM_WORD = "CLEAR";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setReport(null);

    startTransition(async () => {
      const result = await importWorkbook(businessSlug, formData);
      setReport(result);
    });
  }

  function handleClear() {
    setShowConfirm(false);
    setConfirmText("");
    setClearResult(null);
    setReport(null);

    startClearTransition(async () => {
      const result = await clearBusinessData(businessSlug);
      setClearResult(result);
    });
  }

  const busy = isPending || isClearing;

  return (
    <div className="space-y-8">
      {/* ── Import form ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Workbook file (.xlsx)
            </label>
            <input
              ref={fileRef}
              name="file"
              type="file"
              accept=".xlsx"
              required
              disabled={busy}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#0E4D3A] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import
              </>
            )}
          </button>
        </form>

        {/* Import error */}
        {report?.error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {report.error}
          </div>
        )}

        {/* Import report */}
        {report && !report.error && (
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Data Sheets
              </h2>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {Object.entries(report.sheets).map(([name, result]) => (
                  <SheetRow key={name} name={name} result={result} />
                ))}
              </div>
            </div>

            {Object.keys(report.lookups).length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Lookup Tables Seeded
                </h2>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {Object.entries(report.lookups).map(([name, result]) => (
                    <LookupRow key={name} name={name} result={result} />
                  ))}
                </div>
              </div>
            )}

            {Object.keys(report.lookups).length === 0 && (
              <p className="text-sm italic text-gray-500">
                No KEY sheets found — lookup tables were not seeded. Make sure your workbook
                includes sheets named &quot;Plant KEY&quot;, &quot;Product KEY&quot;, etc.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-red-200 bg-red-50/40 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-0.5 text-sm text-red-600">
            Permanently deletes <strong>all records and lookup entries</strong> for this business.
            Use this before re-importing a corrected workbook. This cannot be undone.
          </p>
        </div>

        {/* Clear result */}
        {clearResult && (
          clearResult.ok ? (
            <div className="rounded-md border border-emerald-200 bg-white p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-700">All data cleared successfully.</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-4">
                {Object.entries(clearResult.counts ?? {}).map(([label, count]) => (
                  <span key={label}>
                    <span className="font-semibold text-gray-800">{count}</span> {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-white p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {clearResult.error ?? "Something went wrong."}
            </div>
          )
        )}

        {!showConfirm ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear all business data
          </button>
        ) : (
          <div className="space-y-3 rounded-md border border-red-300 bg-white p-4">
            <p className="text-sm text-gray-700">
              Type <strong>{CONFIRM_WORD}</strong> to confirm you want to permanently delete all
              data for this business.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={CONFIRM_WORD}
              autoFocus
              className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase tracking-widest"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={confirmText !== CONFIRM_WORD || busy}
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Clearing…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Yes, clear everything
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Report row components ────────────────────────────────────────────────────

function SheetRow({ name, result }: { name: string; result: SheetResult }) {
  if (result.notFound) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <MinusCircle className="h-4 w-4 shrink-0 text-gray-300" />
        <span className="flex-1 text-sm text-gray-400">{name}</span>
        <span className="text-xs italic text-gray-400">sheet not found</span>
      </div>
    );
  }

  const hasActivity = result.inserted > 0 || result.skippedDuplicates > 0 || result.skippedMissing > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <CheckCircle className={`h-4 w-4 shrink-0 ${hasActivity ? "text-emerald-500" : "text-gray-300"}`} />
      <span className="flex-1 text-sm font-medium text-gray-800">{name}</span>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          <span className="font-semibold text-emerald-600">{result.inserted}</span> inserted
        </span>
        {result.skippedDuplicates > 0 && (
          <span>
            <span className="font-semibold text-amber-600">{result.skippedDuplicates}</span> already existed
          </span>
        )}
        {result.skippedMissing > 0 && (
          <span>
            <span className="font-semibold text-gray-400">{result.skippedMissing}</span> skipped
          </span>
        )}
      </div>
    </div>
  );
}

function LookupRow({ name, result }: { name: string; result: LookupResult }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <CheckCircle
        className={`h-4 w-4 shrink-0 ${result.added > 0 ? "text-emerald-500" : "text-gray-300"}`}
      />
      <span className="flex-1 text-sm text-gray-700">{name}</span>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          <span className="font-semibold text-emerald-600">{result.added}</span> added
        </span>
        {result.alreadyExisted > 0 && (
          <span>
            <span className="font-semibold text-gray-400">{result.alreadyExisted}</span> already existed
          </span>
        )}
      </div>
    </div>
  );
}
