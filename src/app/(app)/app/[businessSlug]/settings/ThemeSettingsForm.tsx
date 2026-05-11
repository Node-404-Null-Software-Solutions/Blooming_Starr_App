"use client";

import { useTransition, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessTheme } from "@/lib/actions/settings";

type ThemeSettingsFormProps = {
  businessSlug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

function syncHexToColorInput(form: HTMLFormElement, hexName: string, colorName: string) {
  const hexInput = form.querySelector<HTMLInputElement>(`input[name="${hexName}"]`);
  const colorInput = form.querySelector<HTMLInputElement>(`input[name="${colorName}"]`);
  if (!hexInput?.value.trim() || !colorInput) return;
  const hex = hexInput.value.trim();
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) colorInput.value = normalized;
}

export function ThemeSettingsForm({
  businessSlug,
  primaryColor,
  secondaryColor,
  logoUrl: initialLogoUrl,
}: ThemeSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setLogoUrl(initialLogoUrl);
  }, [initialLogoUrl]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "image/png") return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Upload failed");
        return;
      }
      const { url } = await res.json();
      setLogoUrl(url);
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleClearLogo() {
    setLogoUrl(null);
    const form = formRef.current;
    if (form) {
      const data = new FormData(form);
      data.set("logoUrl", "");
      startTransition(async () => {
        await updateBusinessTheme(businessSlug, data);
        router.refresh();
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    syncHexToColorInput(form, "primaryColorHex", "primaryColor");
    syncHexToColorInput(form, "secondaryColorHex", "secondaryColor");
    const data = new FormData(form);
    data.set("logoUrl", logoUrl ?? "");
    startTransition(async () => {
      await updateBusinessTheme(businessSlug, data);
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-4 space-y-6"
    >

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Logo (PNG)</span>
        <div className="flex flex-wrap items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-10 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <span className="text-sm text-gray-500">No logo set</span>
          )}
          <input
            type="hidden"
            name="logoUrl"
            value={logoUrl ?? ""}
            readOnly
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,.png"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-70"
          >
            {uploading ? "Uploading…" : "Upload PNG"}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={handleClearLogo}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Clear logo
            </button>
          )}
        </div>
      </div>


      <div className="flex flex-wrap items-end gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="primaryColor"
          className="text-sm font-medium text-gray-700"
        >
          Primary color
        </label>
        <div className="flex items-center gap-2">
          <input
            id="primaryColor"
            type="color"
            name="primaryColor"
            defaultValue={primaryColor}
            className="h-10 w-14 cursor-pointer rounded border border-gray-300"
          />
          <input
            type="text"
            name="primaryColorHex"
            defaultValue={primaryColor}
            placeholder="#16a34a"
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm"
            onChange={(e) => {
              const hex = e.target.value.trim();
              if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^[0-9A-Fa-f]{6}$/.test(hex)) {
                const colorInput = e.currentTarget
                  .closest("form")
                  ?.querySelector<HTMLInputElement>('input[name="primaryColor"]');
                if (colorInput) colorInput.value = hex.startsWith("#") ? hex : `#${hex}`;
              }
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="secondaryColor"
          className="text-sm font-medium text-gray-700"
        >
          Secondary color
        </label>
        <div className="flex items-center gap-2">
          <input
            id="secondaryColor"
            type="color"
            name="secondaryColor"
            defaultValue={secondaryColor}
            className="h-10 w-14 cursor-pointer rounded border border-gray-300"
          />
          <input
            type="text"
            name="secondaryColorHex"
            defaultValue={secondaryColor}
            placeholder="#15803d"
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm"
            onChange={(e) => {
              const hex = e.target.value.trim();
              if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^[0-9A-Fa-f]{6}$/.test(hex)) {
                const colorInput = e.currentTarget
                  .closest("form")
                  ?.querySelector<HTMLInputElement>('input[name="secondaryColor"]');
                if (colorInput) colorInput.value = hex.startsWith("#") ? hex : `#${hex}`;
              }
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70"
      >
        {isPending ? "Saving…" : "Save theme"}
      </button>
      </div>
    </form>
  );
}
