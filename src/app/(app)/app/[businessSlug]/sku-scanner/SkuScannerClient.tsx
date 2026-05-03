"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ImageUp, Search, Square, X } from "lucide-react";
import QrScanner from "qr-scanner";
import { centsToUsdFixed as money } from "@/lib/formulas";

export type InventoryLookupItem = {
  sku: string;
  kind: "Product" | "Plant";
  name: string;
  qtyPurchased: number;
  qtySold: number;
  qtyUsed: number;
  qtyRemaining: number;
  costCents: number;
  salePriceCents: number;
  status: string;
  href: string;
};

function extractSku(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const skuParam =
      url.searchParams.get("sku") ??
      url.searchParams.get("SKU") ??
      url.searchParams.get("code") ??
      url.searchParams.get("barcode");
    if (skuParam) return skuParam.trim();

    const pathSku = url.pathname.split("/").filter(Boolean).pop();
    if (pathSku) return decodeURIComponent(pathSku).trim();
  } catch {
    // Plain SKU QR codes are expected, so non-URL values are fine.
  }

  return trimmed;
}

export default function SkuScannerClient({
  businessSlug,
  items,
}: {
  businessSlug: string;
  items: InventoryLookupItem[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [status, setStatus] = useState("");
  const [diagnostics, setDiagnostics] = useState<{
    origin: string;
    secureContext: boolean;
    hasMediaDevices: boolean;
    permissionState: string;
  } | null>(null);
  const isSecureContextReady =
    typeof window === "undefined" ? true : window.isSecureContext;

  const sku = extractSku(rawValue || manualSku);
  const matches = useMemo(() => {
    const normalized = sku.toLowerCase();
    if (!normalized) return [];
    return items.filter((item) => item.sku.toLowerCase() === normalized);
  }, [items, sku]);

  function stopScanner() {
    scannerRef.current?.stop();
    setIsScanning(false);
    setStatus("");
  }

  function destroyScanner() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsScanning(false);
    setStatus("");
  }

  function getCameraErrorMessage(error: unknown) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return "Phone camera scanning requires HTTPS or localhost. Open this page over HTTPS to use the camera.";
    }

    if (!(error instanceof Error)) {
      return "Camera access was unavailable. Check browser permissions and try again.";
    }

    if (error.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access in the browser, then try again.";
    }

    if (error.name === "NotFoundError") {
      return "No camera was found on this device.";
    }

    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app or browser tab.";
    }

    return "Camera access was unavailable. Check browser permissions and try again.";
  }

  async function refreshDiagnostics() {
    if (typeof window === "undefined") return;

    let permissionState = "unknown";
    try {
      if ("permissions" in navigator && "query" in navigator.permissions) {
        const permission = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        permissionState = permission.state;
      }
    } catch {
      permissionState = "unsupported";
    }

    setDiagnostics({
      origin: window.location.origin,
      secureContext: window.isSecureContext,
      hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
      permissionState,
    });
  }

  async function startScanner() {
    setError("");
    setRawValue("");
    setStatus("");
    await refreshDiagnostics();

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Phone camera scanning requires HTTPS or localhost. Open this page over HTTPS to use the camera."
      );
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setError("The camera preview is not ready yet. Refresh the page and try again.");
      return;
    }

    try {
      destroyScanner();

      const scanner = new QrScanner(video, (result) => {
        setRawValue(result.data);
        setManualSku("");
        setError("");
        stopScanner();
      }, {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 12,
        returnDetailedScanResult: true,
        onDecodeError: () => {
          // Ignore transient decode misses while the camera is searching.
        },
      });
      scannerRef.current = scanner;

      setStatus("Requesting camera access...");
      await scanner.start();
      setIsScanning(true);
      setStatus("Point the camera at a QR code.");
    } catch (cameraError) {
      destroyScanner();
      setError(getCameraErrorMessage(cameraError));
      await refreshDiagnostics();
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setStatus("Scanning uploaded image...");

    try {
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      setRawValue(result.data);
      setManualSku("");
      setStatus("");
    } catch {
      setError("No QR code was found in that image.");
      setStatus("");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    void refreshDiagnostics();
    return () => destroyScanner();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">SKU Scanner</h1>
          <p className="text-sm text-gray-600">
            Scan a QR code with the phone camera or type a SKU to find current inventory.
          </p>
        </div>
        <Link
          href={`/app/${businessSlug}/product-inventory`}
          className="text-sm font-medium text-(--primary) hover:underline"
        >
          View product inventory
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="relative aspect-[4/3] bg-gray-950">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                <Camera className="h-10 w-10 text-white/80" />
                <p className="max-w-xs text-sm text-white/75">
                  Point the camera at a QR code that contains the SKU.
                </p>
              </div>
            )}
            {isScanning && (
              <div className="absolute inset-8 rounded-lg border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 p-3">
            {isScanning ? (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Camera className="h-4 w-4" />
                Start camera
              </button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ImageUp className="h-4 w-4" />
              Scan photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {(rawValue || manualSku) && (
              <button
                type="button"
                onClick={() => {
                  setRawValue("");
                  setManualSku("");
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm font-medium text-gray-700" htmlFor="manual-sku">
              SKU lookup
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="manual-sku"
                value={manualSku}
                onChange={(event) => {
                  setManualSku(event.target.value);
                  setRawValue("");
                }}
                placeholder="Scan or type SKU"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)/30"
              />
            </div>
            {sku && (
              <p className="mt-3 text-xs text-gray-500">
                Looking up <span className="font-mono text-gray-700">{sku}</span>
              </p>
            )}
            {status && !error && (
              <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {status}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </p>
            )}
            {!isSecureContextReady && (
              <p className="mt-3 text-xs text-gray-500">
                Camera access on phones only works from `https://` or `localhost`.
              </p>
            )}
            {diagnostics && (
              <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <p>Origin: {diagnostics.origin}</p>
                <p>Secure context: {diagnostics.secureContext ? "yes" : "no"}</p>
                <p>Camera API available: {diagnostics.hasMediaDevices ? "yes" : "no"}</p>
                <p>Permission state: {diagnostics.permissionState}</p>
              </div>
            )}
          </div>

          {sku && matches.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
              No inventory found for <span className="font-mono">{sku}</span>.
            </div>
          )}

          {matches.map((item) => (
            <div key={`${item.kind}-${item.sku}`} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{item.sku}</p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-gray-900" title={item.name}>
                    {item.name || item.sku}
                  </h2>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {item.kind}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Remaining</p>
                  <p className="text-xl font-semibold text-gray-900">{item.qtyRemaining}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <p className="font-medium text-gray-900">{item.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Purchased</p>
                  <p className="font-medium text-gray-900">{item.qtyPurchased}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Sold</p>
                  <p className="font-medium text-gray-900">{item.qtySold}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Cost</p>
                  <p className="font-medium text-gray-900">{money(item.costCents)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Price</p>
                  <p className="font-medium text-gray-900">{money(item.salePriceCents)}</p>
                </div>
              </div>

              <Link
                href={item.href}
                className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open inventory
              </Link>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
