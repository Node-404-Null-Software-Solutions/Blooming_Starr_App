import path from "path";

export function normalizeUploadsPublicPath(value = "/uploads") {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getUploadsRoot() {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "public", "uploads");
}

export function getLogoUploadsDir() {
  return path.join(getUploadsRoot(), "logos");
}

export function getLogoPublicUrl(filename: string) {
  return `${normalizeUploadsPublicPath(process.env.UPLOADS_PUBLIC_PATH)}/logos/${filename}`;
}
