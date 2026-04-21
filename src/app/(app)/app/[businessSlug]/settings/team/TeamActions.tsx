"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveJoinRequest, denyJoinRequest, removeMembership } from "@/lib/actions/settings";

type Props =
  | { mode: "request"; requestId: string; membershipId: null; businessSlug: string }
  | { mode: "member"; membershipId: string; requestId: null; businessSlug: string };

export default function TeamActions(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(action: "approve" | "deny" | "remove") {
    startTransition(async () => {
      if (action === "approve" && props.requestId) {
        await approveJoinRequest(props.requestId, props.businessSlug);
      } else if (action === "deny" && props.requestId) {
        await denyJoinRequest(props.requestId, props.businessSlug);
      } else if (action === "remove" && props.membershipId) {
        await removeMembership(props.membershipId, props.businessSlug);
      }
      router.refresh();
    });
  }

  if (props.mode === "request") {
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

  return (
    <button
      type="button"
      onClick={() => handle("remove")}
      disabled={isPending}
      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
