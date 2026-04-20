"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveJoinRequest, denyJoinRequest } from "@/lib/actions/settings";

export default function TeamActions({
  requestId,
  businessSlug,
}: {
  requestId: string;
  businessSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(action: "approve" | "deny") {
    startTransition(async () => {
      const fn = action === "approve" ? approveJoinRequest : denyJoinRequest;
      await fn(requestId, businessSlug);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handle("approve")}
        disabled={isPending}
        className="rounded-md bg-[#0E4D3A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => handle("deny")}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Deny
      </button>
    </div>
  );
}
