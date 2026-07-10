import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";

export const plantStyleFieldClass =
  "h-12 w-full min-w-0 rounded-sm border border-gray-300 bg-white px-3 text-center text-lg text-gray-900 outline-none focus:border-[#08bd12] focus:ring-1 focus:ring-[#08bd12]";

type PlantStyleAddFormShellProps = {
  action: (fd: FormData) => Promise<void>;
  children: ReactNode;
};

export function PlantStyleAddFormShell({
  action,
  children,
}: PlantStyleAddFormShellProps) {
  return (
    <form action={action} className="min-h-[calc(100vh-3.5rem)] overflow-x-hidden bg-white">
      {children}
    </form>
  );
}

type PlantStyleAddFormHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
};

export function PlantStyleAddFormHeader({
  backHref,
  backLabel,
  title,
}: PlantStyleAddFormHeaderProps) {
  return (
    <div className="border-b border-transparent px-4 py-3 sm:flex sm:h-[60px] sm:items-center sm:justify-between sm:py-0">
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center sm:flex sm:gap-4">
        <Link
          href={backHref}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center justify-self-start text-gray-600 hover:text-gray-900"
          aria-label={backLabel}
        >
          <X className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 text-center text-xl font-normal text-gray-900">
          {title}
        </h1>
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-center gap-2 sm:mt-0 sm:justify-end">
        <Link
          href={backHref}
          className="inline-flex h-8 items-center rounded-sm border border-[#08bd12] bg-white px-3 text-base text-[#08bd12] hover:bg-green-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-sm bg-[#08bd12] px-4 text-base font-medium text-white hover:bg-[#08aa12]"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function PlantStyleAddFormBody({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-y-5 px-4 pt-7 sm:gap-y-[25px]">
      {children}
    </div>
  );
}

export function PlantStyleFormRow({
  children,
  label,
  required = false,
  alignStart = false,
  htmlFor,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
  alignStart?: boolean;
  htmlFor?: string;
}) {
  return (
    <div
      className={`grid min-w-0 gap-y-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-x-7 ${
        alignStart ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <label
        htmlFor={htmlFor}
        className={`text-center text-sm text-gray-600 ${
          alignStart ? "sm:pt-3" : ""
        }`}
      >
        {label}
        {required ? <span className="text-[#08bd12]">*</span> : null}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type TextInputRowProps = {
  label: string;
  id: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function PlantStyleTextInputRow({
  label,
  id,
  required,
  className,
  ...props
}: TextInputRowProps) {
  return (
    <PlantStyleFormRow label={label} htmlFor={id} required={required}>
      <input
        id={id}
        required={required}
        className={[plantStyleFieldClass, className].filter(Boolean).join(" ")}
        {...props}
      />
    </PlantStyleFormRow>
  );
}

type SelectOption = {
  id: string;
  name: string;
};

type SelectRowProps = {
  label: string;
  id: string;
  options: SelectOption[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function PlantStyleSelectRow({
  label,
  id,
  options,
  required,
  className,
  ...props
}: SelectRowProps) {
  return (
    <PlantStyleFormRow label={label} htmlFor={id} required={required}>
      <div className="relative min-w-0">
        <select
          id={id}
          required={required}
          className={[`${plantStyleFieldClass} appearance-none pr-10`, className]
            .filter(Boolean)
            .join(" ")}
          defaultValue=""
          {...props}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </PlantStyleFormRow>
  );
}

type TextareaRowProps = {
  label: string;
  id: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function PlantStyleTextareaRow({
  label,
  id,
  required,
  className,
  ...props
}: TextareaRowProps) {
  return (
    <PlantStyleFormRow label={label} htmlFor={id} required={required} alignStart>
      <textarea
        id={id}
        required={required}
        className={[`${plantStyleFieldClass} min-h-24 py-3`, className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    </PlantStyleFormRow>
  );
}
