"use client";

import { useState, useTransition } from "react";
import {
  createLookupEntry,
  updateLookupEntry,
  deleteLookupEntry,
} from "@/lib/actions/lookups";
import type { LookupRow, LookupTable } from "@/lib/actions/lookups";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

type TableDef = { key: LookupTable; label: string };

type Props = {
  businessSlug: string;
  tables: TableDef[];
  initialData: Record<string, LookupRow[]>;
};

export default function LookupsManager({ businessSlug, tables, initialData }: Props) {
  const [activeTab, setActiveTab] = useState(tables[0].key);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();


  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newParentCode, setNewParentCode] = useState("");
  const [addError, setAddError] = useState("");


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editError, setEditError] = useState("");

  const rows = data[activeTab] ?? [];
  const showParentCode = activeTab === "cultivar";

  function resetAdd() {
    setAdding(false);
    setNewName("");
    setNewCode("");
    setNewParentCode("");
    setAddError("");
  }

  function resetEdit() {
    setEditingId(null);
    setEditName("");
    setEditCode("");
    setEditError("");
  }

  function handleAdd() {
    if (!newName.trim() || !newCode.trim()) {
      setAddError("Name and code are required");
      return;
    }
    startTransition(async () => {
      const res = await createLookupEntry(
        businessSlug,
        activeTab,
        newName,
        newCode,
        showParentCode ? newParentCode || null : null
      );
      if (!res.ok) {
        setAddError(res.error ?? "Failed to create");
        return;
      }

      const newRow: LookupRow = {
        id: crypto.randomUUID(),
        table: activeTab,
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        parentCode: showParentCode ? newParentCode.trim() || null : null,
        sortOrder: rows.length,
      };
      setData((prev) => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] ?? []), newRow],
      }));
      resetAdd();
    });
  }

  function startEdit(row: LookupRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditCode(row.code);
    setEditError("");
  }

  function handleUpdate(id: string) {
    if (!editName.trim() || !editCode.trim()) {
      setEditError("Name and code are required");
      return;
    }
    startTransition(async () => {
      const res = await updateLookupEntry(id, businessSlug, {
        name: editName,
        code: editCode,
      });
      if (!res.ok) {
        setEditError(res.error ?? "Failed to update");
        return;
      }
      setData((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).map((r) =>
          r.id === id
            ? { ...r, name: editName.trim(), code: editCode.trim().toUpperCase() }
            : r
        ),
      }));
      resetEdit();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteLookupEntry(id, businessSlug);
      if (!res.ok) return;
      setData((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter((r) => r.id !== id),
      }));
    });
  }

  const inputClass = "rounded-md border border-gray-300 px-2 py-1 text-sm";
  const btnClass =
    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium";

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {tables.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              resetAdd();
              resetEdit();
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-green-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-75">
              ({(data[t.key] ?? []).length})
            </span>
          </button>
        ))}
      </div>


      <div className="rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-2 font-medium text-gray-600">Name</th>
              <th className="px-4 py-2 font-medium text-gray-600">Code</th>
              {showParentCode && (
                <th className="px-4 py-2 font-medium text-gray-600">
                  Genus code
                </th>
              )}
              <th className="px-4 py-2 font-medium text-gray-600 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 last:border-0"
              >
                {editingId === row.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className={`${inputClass} font-mono uppercase`}
                      />
                    </td>
                    {showParentCode && (
                      <td className="px-4 py-2 text-gray-400">
                        {row.parentCode ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdate(row.id)}
                          disabled={isPending}
                          className={`${btnClass} text-green-700 hover:bg-green-50`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={resetEdit}
                          className={`${btnClass} text-gray-500 hover:bg-gray-50`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {editError && (
                        <p className="text-xs text-red-600 mt-1">{editError}</p>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-gray-900">{row.name}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">
                      {row.code}
                    </td>
                    {showParentCode && (
                      <td className="px-4 py-2 font-mono text-gray-500">
                        {row.parentCode ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(row)}
                          className={`${btnClass} text-gray-500 hover:bg-gray-50`}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          disabled={isPending}
                          className={`${btnClass} text-red-500 hover:bg-red-50`}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}


            {adding ? (
              <tr className="bg-green-50/50">
                <td className="px-4 py-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className={inputClass}
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code"
                    className={`${inputClass} font-mono uppercase`}
                  />
                </td>
                {showParentCode && (
                  <td className="px-4 py-2">
                    <input
                      value={newParentCode}
                      onChange={(e) => setNewParentCode(e.target.value)}
                      placeholder="Genus code"
                      className={`${inputClass} font-mono uppercase`}
                    />
                  </td>
                )}
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={handleAdd}
                      disabled={isPending}
                      className={`${btnClass} text-green-700 hover:bg-green-50`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={resetAdd}
                      className={`${btnClass} text-gray-500 hover:bg-gray-50`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {addError && (
                    <p className="text-xs text-red-600 mt-1">{addError}</p>
                  )}
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={showParentCode ? 4 : 3} className="px-4 py-2">
                  <button
                    onClick={() => setAdding(true)}
                    className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add entry
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {rows.length === 0 && !adding && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No entries yet. Click &quot;Add entry&quot; to create one.
          </p>
        )}
      </div>
    </div>
  );
}
