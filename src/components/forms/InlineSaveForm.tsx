"use client";

import {
  type FormEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

export type InlineSaveResult = {
  ok: boolean;
  error?: string;
};

export type InlineSaveAction = (
  formData: FormData
) => Promise<InlineSaveResult>;

export default function InlineSaveForm({
  action,
  successHref,
  className,
  children,
}: {
  action: InlineSaveAction;
  successHref: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          setError(result.error ?? "Unable to save this record.");
          return;
        }
        router.push(successHref);
        router.refresh();
      } catch {
        setError("Unable to save this record. Please try again.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      aria-busy={isPending}
    >
      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mx-auto mt-3 max-w-[560px] rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      {isPending ? (
        <p
          role="status"
          className="mx-auto mt-3 max-w-[560px] text-center text-sm text-gray-500"
        >
          Saving…
        </p>
      ) : null}
      {children}
    </form>
  );
}
