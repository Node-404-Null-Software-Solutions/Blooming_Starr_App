"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
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
  const titleId = useId();
  const titleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    titleRef.current?.focus();
  }, [isOpen, title]);

  const visibleFields = fields.filter((field) => !isEmptyNode(field.node));

  return (
    <>
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-200 ease-out lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:w-full lg:translate-y-0 lg:border-l lg:border-gray-200 lg:shadow-none ${
          isOpen ? "translate-y-0" : "translate-y-full lg:hidden"
        }`}
      >

        <div className="flex h-[60px] shrink-0 items-center justify-between bg-[#08bd12] px-4 text-white shadow-sm lg:h-auto lg:border-b lg:border-gray-200 lg:bg-white lg:py-3 lg:text-gray-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white lg:hidden">
              <Sprout className="h-5 w-5 text-[#08bd12]" />
            </div>
            <p
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              className="truncate text-lg font-medium outline-none lg:text-sm lg:font-semibold"
            >
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 hidden shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 lg:inline-flex"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete row"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10 lg:hidden"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>


        <div className="flex-1 overflow-y-auto px-4 py-6 lg:py-3">
          <dl className="mx-auto grid max-w-[620px] gap-5 text-center text-sm lg:max-w-none lg:grid-cols-[auto_1fr] lg:items-center lg:gap-x-4 lg:gap-y-2 lg:text-left">
            {visibleFields.map(({ label, node }) => (
              <div key={label} className="contents lg:contents">
                <dt className="text-xs font-medium uppercase text-gray-500 lg:whitespace-nowrap lg:text-sm lg:font-normal lg:normal-case">{label}</dt>
                <dd className="min-w-0 text-base text-gray-900 lg:text-sm">{node}</dd>
              </div>
            ))}
          </dl>
        </div>


        <div className="hidden shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3 lg:flex">
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
