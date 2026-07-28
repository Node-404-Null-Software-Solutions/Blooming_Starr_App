"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import {
  MAX_RECORD_PHOTO_BYTES,
  RECORD_PHOTO_ACCEPT,
} from "@/lib/record-photo";

export default function PhotoPicker({ name = "photo" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPhotoName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      clearPhoto();
      return;
    }
    if (file.size > MAX_RECORD_PHOTO_BYTES) {
      clearPhoto();
      setError("Photo must be 5 MB or smaller.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
    setError("");
  }

  return (
    <div className="space-y-2">
      <label className="relative flex min-h-[68px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={RECORD_PHOTO_ACCEPT}
          capture="environment"
          className="sr-only"
          onChange={handleChange}
        />
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Selected photo preview"
            width={360}
            height={180}
            unoptimized
            className="h-36 w-full object-cover"
          />
        ) : (
          <span className="inline-flex items-center gap-2">
            <Camera className="h-6 w-6" />
            <span className="text-sm">Choose or take photo</span>
          </span>
        )}
      </label>
      <div className="flex min-h-5 items-start justify-between gap-2 text-xs">
        <span className={error ? "text-red-600" : "truncate text-gray-500"}>
          {error || photoName || "JPEG, PNG, or WebP · 5 MB maximum"}
        </span>
        {previewUrl ? (
          <button
            type="button"
            onClick={clearPhoto}
            className="inline-flex shrink-0 items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
