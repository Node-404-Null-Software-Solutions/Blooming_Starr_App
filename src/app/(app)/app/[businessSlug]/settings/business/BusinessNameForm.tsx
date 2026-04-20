"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";
import { updateBusinessName } from "@/lib/actions/settings";

export default function BusinessNameForm({
  name: initialName,
  businessSlug,
}: {
  name: string;
  businessSlug: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setEditing(false);
    setName(initialName);
    setError("");
  }

  function save() {
    setError("");
    const fd = new FormData();
    fd.append("name", name);
    startTransition(async () => {
      const res = await updateBusinessName(businessSlug, fd);
      if (!res.ok) {
        setError(res.error ?? "Failed to save");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{name || "—"}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Edit business name"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          maxLength={100}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        />
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded p-1.5 text-[#0E4D3A] hover:bg-[#0E4D3A]/10 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
