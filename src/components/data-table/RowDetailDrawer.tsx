"use client";

import { Children, isValidElement, useEffect, type ReactNode } from "react";
import { ArrowLeft, Sprout, Trash2, X } from "lucide-react";

type Field = {
  label: string;
  node: ReactNode;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  onDelete: () => void;
};

function isEmptyDetailValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return false;
  if (typeof value === "string") {
    const text = value.trim();
    return text === "" || text === "-" || text === "—" || text === "â€”";
  }
  if (Array.isArray(value)) return value.every(isEmptyDetailValue);
  return false;
}

function isEmptyNode(node: ReactNode): boolean {
  if (isEmptyDetailValue(node)) return true;
  if (!isValidElement(node)) return false;

  const props = node.props as { value?: unknown; children?: ReactNode };
  if ("value" in props) return isEmptyDetailValue(props.value);
  if ("children" in props) {
    const children = Children.toArray(props.children);
    return children.length === 0 || children.every(isEmptyNode);
  }

  return false;
}

export function RowDetailDrawer({ isOpen, onClose, title, fields, onDelete }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const visibleFields = fields.filter((field) => !isEmptyNode(field.node));

  return (
    <>

      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-40 hidden bg-black/40 transition-opacity duration-200 md:block ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />


      <div
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-200 ease-out md:inset-x-0 md:bottom-0 md:top-auto md:max-h-[85vh] md:rounded-t-2xl md:shadow-xl ${
          isOpen ? "translate-y-0" : "translate-y-full md:translate-y-full"
        }`}
      >

        <div className="flex h-[60px] shrink-0 items-center justify-between bg-[#08bd12] px-4 text-white shadow-sm md:h-auto md:border-b md:border-gray-200 md:bg-white md:py-3 md:text-gray-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white md:hidden">
              <Sprout className="h-5 w-5 text-[#08bd12]" />
            </div>
            <p className="truncate text-lg font-medium md:text-sm md:font-semibold">{title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 hidden shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 md:inline-flex"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete row"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10 md:hidden"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>


        <div className="flex-1 overflow-y-auto px-4 py-6 md:py-3">
          <dl className="mx-auto grid max-w-[620px] gap-5 text-center text-sm md:max-w-none md:grid-cols-[auto_1fr] md:items-center md:gap-x-4 md:gap-y-2 md:text-left">
            {visibleFields.map(({ label, node }) => (
              <div key={label} className="contents md:contents">
                <dt className="text-xs font-medium uppercase text-gray-500 md:whitespace-nowrap md:text-sm md:font-normal md:normal-case">{label}</dt>
                <dd className="min-w-0 text-base text-gray-900 md:text-sm">{node}</dd>
              </div>
            ))}
          </dl>
        </div>


        <div className="hidden shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3 md:flex">
          <button
            onClick={onDelete}
            className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Delete Row
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
