"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, QrCode, Square, X } from "lucide-react";
import QrScanner from "qr-scanner";
import { extractQrValue } from "./qr-value";

type QrScanButtonProps = {
  label: string;
  onScan: (value: string) => void;
  className?: string;
  iconOnly?: boolean;
};

export default function QrScanButton({
  label,
  onScan,
  className,
  iconOnly = false,
}: QrScanButtonProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function stopScanner() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setStatus("");
  }

  function closeScanner() {
    stopScanner();
    setIsOpen(false);
    setError("");
  }

  function handleScannedValue(value: string) {
    const nextValue = extractQrValue(value);
    if (!nextValue) {
      setError("That QR code did not contain a usable value.");
      return;
    }
    onScan(nextValue);
    closeScanner();
  }

  function getCameraErrorMessage(errorValue: unknown) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return "Camera scanning requires HTTPS or localhost.";
    }

    if (!(errorValue instanceof Error)) {
      return "Camera access was unavailable. Check browser permissions and try again.";
    }

    if (errorValue.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access, then try again.";
    }

    if (errorValue.name === "NotFoundError") {
      return "No camera was found on this device.";
    }

    if (errorValue.name === "NotReadableError") {
      return "The camera is already in use by another app or browser tab.";
    }

    return "Camera access was unavailable. Check browser permissions and try again.";
  }

  async function startScanner() {
    setError("");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning requires HTTPS or localhost.");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setError("The camera preview is not ready yet.");
      return;
    }

    try {
      stopScanner();
      setStatus("Requesting camera access...");
      video.setAttribute("playsinline", "true");
      video.muted = true;

      const scanner = new QrScanner(
        video,
        (result) => handleScannedValue(result.data),
        {
          maxScansPerSecond: 8,
          onDecodeError: () => {},
          preferredCamera: "environment",
          returnDetailedScanResult: true,
        },
      );

      scanner.setInversionMode("both");
      scannerRef.current = scanner;
      await scanner.start();
      setIsScanning(true);
      setStatus("Point the camera at a QR code.");
    } catch (cameraError) {
      stopScanner();
      setError(getCameraErrorMessage(cameraError));
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
      handleScannedValue(result.data);
    } catch {
      setError("No QR code was found in that image.");
      setStatus("");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    return () => stopScanner();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ??
          "inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50"
        }
        aria-label={label}
        title={label}
      >
        <QrCode className="h-4 w-4" />
        {!iconOnly && <span className="ml-2">{label}</span>}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{label}</h2>
                <p className="text-sm text-gray-500">Scan a QR code or upload a QR photo.</p>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close scanner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-gray-950">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {!isScanning ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <Camera className="h-10 w-10 text-white/80" />
                  <p className="max-w-xs text-sm text-white/75">
                    Use the rear camera when scanning plant labels.
                  </p>
                </div>
              ) : (
                <div className="absolute inset-8 rounded-lg border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
              )}
            </div>

            <div className="space-y-3 border-t border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
              {status && !error ? (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>
              ) : null}
              {error ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
