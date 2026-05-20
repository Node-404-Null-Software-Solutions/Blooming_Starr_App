"use client";

import { useState, useTransition } from "react";
import {
  createPlantSkuReference,
  deactivatePlantSkuReference,
  updatePlantSkuReference,
  type PlantSkuReferenceRow,
} from "@/lib/actions/plant-sku-references";
import { Check, Pencil, Plus, X } from "lucide-react";

type Props = {
  businessSlug: string;
  initialRows: PlantSkuReferenceRow[];
};

const SCOPES = ["plant", "category", "variety"];

export default function PlantSkuReferencesManager({
  businessSlug,
  initialRows,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [scope, setScope] = useState("plant");
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const visibleRows = rows.filter((row) => row.scope === scope);

  function refreshRow(id: string, data: Partial<PlantSkuReferenceRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...data } : row)));
  }

  function handleAdd() {
    setError("");
    startTransition(async () => {
      const res = await createPlantSkuReference(businessSlug, {
        scope,
        displayName: newName,
        code: newCode,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to create");
        return;
      }
      window.location.reload();
    });
  }

  function handleUpdate(id: string) {
    setError("");
    startTransition(async () => {
      const res = await updatePlantSkuReference(id, businessSlug, {
        displayName: editName,
        code: editCode,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to update");
        return;
      }
      refreshRow(id, {
        displayName: editName.trim(),
        normalizedName: editName.trim().replace(/\s+/g, " ").toUpperCase(),
        code: editCode.trim().toUpperCase(),
      });
      setEditingId(null);
    });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const res = await deactivatePlantSkuReference(id, businessSlug);
      if (res.ok) refreshRow(id, { active: false });
    });
  }

  const inputClass = "rounded-md border border-gray-300 px-2 py-1 text-sm";
  const btnClass = "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {SCOPES.map((item) => (
          <button
            key={item}
            onClick={() => {
              setScope(item);
              setAdding(false);
              setEditingId(null);
              setError("");
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === item ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-2 font-medium text-gray-600">Name</th>
              <th className="px-4 py-2 font-medium text-gray-600">Code</th>
              <th className="px-4 py-2 font-medium text-gray-600">Status</th>
              <th className="w-28 px-4 py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                {editingId === row.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editCode} onChange={(e) => setEditCode(e.target.value)} className={`${inputClass} font-mono uppercase`} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">{row.active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleUpdate(row.id)} disabled={isPending} className={`${btnClass} text-green-700 hover:bg-green-50`}>
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className={`${btnClass} text-gray-500 hover:bg-gray-50`}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-gray-900">{row.displayName}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{row.code}</td>
                    <td className="px-4 py-2 text-gray-500">{row.active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          setEditingId(row.id);
                          setEditName(row.displayName);
                          setEditCode(row.code);
                        }}
                        className={`${btnClass} text-gray-500 hover:bg-gray-50`}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {row.active && (
                        <button
                          onClick={() => handleDeactivate(row.id)}
                          disabled={isPending}
                          className={`${btnClass} text-red-500 hover:bg-red-50`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding ? (
              <tr className="bg-green-50/50">
                <td className="px-4 py-2">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className={inputClass} autoFocus />
                </td>
                <td className="px-4 py-2">
                  <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code" className={`${inputClass} font-mono uppercase`} />
                </td>
                <td className="px-4 py-2 text-gray-500">Active</td>
                <td className="px-4 py-2">
                  <button onClick={handleAdd} disabled={isPending} className={`${btnClass} text-green-700 hover:bg-green-50`}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setAdding(false)} className={`${btnClass} text-gray-500 hover:bg-gray-50`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-2">
                  <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800">
                    <Plus className="h-4 w-4" />
                    Add reference
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
