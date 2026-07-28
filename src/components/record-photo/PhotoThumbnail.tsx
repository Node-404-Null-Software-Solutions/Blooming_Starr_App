import Image from "next/image";
import { ImageIcon } from "lucide-react";

export default function PhotoThumbnail({
  photoUrl,
  alt,
  size = 36,
  className = "",
}: {
  photoUrl: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!photoUrl) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-gray-100 text-gray-400 ${className}`}
        style={{ width: size, height: size }}
        aria-label="No photo"
      >
        <ImageIcon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={`rounded-sm border border-gray-200 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
