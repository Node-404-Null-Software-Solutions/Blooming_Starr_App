"use client";

import { Fragment, useEffect } from "react";

type Field = {
  label: string;
  node: React.ReactNode;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  onDelete: () => void;
};

export function RowDetailDrawer({ isOpen, onClose, title, fields, onDelete }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>

      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />


      <div
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-xl transition-transform duration-200 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >

        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>


        <div className="flex-1 overflow-y-auto px-4 py-3">
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
            {fields.map(({ label, node }) => (
              <Fragment key={label}>
                <dt className="whitespace-nowrap text-gray-500">{label}</dt>
                <dd className="min-w-0">{node}</dd>
              </Fragment>
            ))}
          </dl>
        </div>


        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3">
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
