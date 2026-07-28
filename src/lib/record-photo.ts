export const MAX_RECORD_PHOTO_BYTES = 5 * 1024 * 1024;
export const RECORD_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type RecordPhotoType = "plant-intake" | "product-intake";

export type ValidatedRecordPhoto = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  data: Uint8Array<ArrayBuffer>;
  originalName: string | null;
};

export type RecordPhotoValidationResult =
  | { ok: true; photo: ValidatedRecordPhoto | null }
  | { ok: false; error: string };

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectRecordPhotoContentType(
  bytes: Uint8Array
): ValidatedRecordPhoto["contentType"] | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function cleanOriginalName(value: string): string | null {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return cleaned || null;
}

export async function readRecordPhoto(
  formData: FormData,
  field = "photo"
): Promise<RecordPhotoValidationResult> {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) {
    return { ok: true, photo: null };
  }
  if (value.size > MAX_RECORD_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be 5 MB or smaller." };
  }

  const data = new Uint8Array(await value.arrayBuffer());
  const contentType = detectRecordPhotoContentType(data);
  if (!contentType) {
    return {
      ok: false,
      error: "Photo must be a JPEG, PNG, or WebP image.",
    };
  }

  return {
    ok: true,
    photo: {
      contentType,
      data,
      originalName: cleanOriginalName(value.name),
    },
  };
}

export function recordPhotoUrl(
  businessSlug: string,
  type: RecordPhotoType,
  recordId: string,
  updatedAt?: Date | string | null
): string {
  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : updatedAt
        ? Date.parse(updatedAt)
        : 0;
  return `/api/record-photo/${encodeURIComponent(
    businessSlug
  )}/${type}/${encodeURIComponent(recordId)}?v=${
    Number.isFinite(version) ? version : 0
  }`;
}
