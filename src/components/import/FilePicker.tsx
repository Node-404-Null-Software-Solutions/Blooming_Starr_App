"use client";

import * as React from "react";

export function FilePicker({
  name,
  accept,
  required,
  id = "xlsx-import-file",
}: {
  name: string;
  accept?: string;
  required?: boolean;
  id?: string;
}) {
  const [filename, setFilename] = React.useState("No file selected");

  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          setFilename(f?.name ?? "No file selected");
        }}
      />

      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2"
      >
        Choose Excel file
      </label>

      <div className="max-w-130 truncate rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
        {filename}
      </div>
    </div>
  );
}
