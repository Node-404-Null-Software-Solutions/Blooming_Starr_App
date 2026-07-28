"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import {
  clearPlantIntakePhoto,
  clearProductIntakePhoto,
  updatePlantIntakePhoto,
  updateProductIntakePhoto,
} from "@/lib/actions/data-entries";
import {
  MAX_RECORD_PHOTO_BYTES,
  RECORD_PHOTO_ACCEPT,
  type RecordPhotoType,
} from "@/lib/record-photo";
import { useBusinessPermissions } from "@/components/permissions/BusinessPermissions";

export default function RecordPhotoManager({
  businessSlug,
  recordId,
  recordType,
  photoUrl,
  alt,
}: {
  businessSlug: string;
  recordId: string;
  recordType: RecordPhotoType;
  photoUrl: string | null;
  alt: string;
}) {
  const { canManageOperations } = useBusinessPermissions();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState(photoUrl);
  const [temporaryUrl, setTemporaryUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentUrl(photoUrl);
  }, [photoUrl]);

  useEffect(
    () => () => {
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    },
    [temporaryUrl]
  );

  function upload(file: File) {
    if (file.size > MAX_RECORD_PHOTO_BYTES) {
      setError("Photo must be 5 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const nextTemporaryUrl = URL.createObjectURL(file);
    if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    setTemporaryUrl(nextTemporaryUrl);
    setCurrentUrl(nextTemporaryUrl);
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("photo", file);
      const result =
        recordType === "plant-intake"
          ? await updatePlantIntakePhoto(recordId, businessSlug, formData)
          : await updateProductIntakePhoto(recordId, businessSlug, formData);
      if (!result.ok) {
        setCurrentUrl(photoUrl);
        setError(result.error ?? "Unable to save photo.");
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setError("");
    startTransition(async () => {
      const result =
        recordType === "plant-intake"
          ? await clearPlantIntakePhoto(recordId, businessSlug)
          : await clearProductIntakePhoto(recordId, businessSlug);
      if (!result.ok) {
        setError(result.error ?? "Unable to remove photo.");
        return;
      }
      setCurrentUrl(null);
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-2">
      <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={alt}
            width={640}
            height={480}
            unoptimized
            className="max-h-64 w-full object-contain"
          />
        ) : (
          <div className="flex h-28 items-center justify-center text-gray-400">
            <Camera className="h-7 w-7" />
          </div>
        )}
      </div>
      {canManageOperations ? (
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          <Camera className="h-3.5 w-3.5" />
          {currentUrl ? "Replace photo" : "Add photo"}
          <input
            ref={inputRef}
            type="file"
            accept={RECORD_PHOTO_ACCEPT}
            capture="environment"
            className="sr-only"
            disabled={isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
        {currentUrl ? (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-sm border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
        {isPending ? <span className="text-xs text-gray-500">Saving…</span> : null}
      </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
