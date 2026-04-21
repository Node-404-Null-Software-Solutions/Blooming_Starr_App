"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { createMemberInvite, createCoOwnerInvite } from "@/lib/actions/settings";

type InviteType = "EMPLOYEE" | "MANAGER" | "CO_OWNER";

export default function InvitePanel({ businessSlug }: { businessSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<InviteType | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate(type: InviteType) {
    setError(null);
    setGeneratedUrl(null);
    setInviteType(type);
    startTransition(async () => {
      const res =
        type === "CO_OWNER"
          ? await createCoOwnerInvite(businessSlug)
          : await createMemberInvite(businessSlug, type);
      if (res.ok && res.url) {
        setGeneratedUrl(res.url);
      } else {
        setError(res.error ?? "Failed to generate invite link");
      }
    });
  }

  function copy() {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const labelMap: Record<InviteType, string> = {
    EMPLOYEE: "Employee",
    MANAGER: "Manager",
    CO_OWNER: "Co-Owner",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Generate a one-time invite link (expires in 7 days). Share it with the person you want to add.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => generate("EMPLOYEE")}
          disabled={isPending}
          className="rounded-md bg-[#0E4D3A] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Invite as Employee
        </button>
        <button
          type="button"
          onClick={() => generate("MANAGER")}
          disabled={isPending}
          className="rounded-md border border-[#0E4D3A] px-3 py-2 text-sm font-medium text-[#0E4D3A] hover:bg-[#0E4D3A]/5 disabled:opacity-50"
        >
          Invite as Manager
        </button>
        <button
          type="button"
          onClick={() => generate("CO_OWNER")}
          disabled={isPending}
          className="rounded-md border border-purple-600 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
        >
          Invite as Co-Owner
        </button>
      </div>

      {isPending && (
        <p className="text-xs text-gray-400">Generating link…</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {generatedUrl && inviteType && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            {labelMap[inviteType]} invite link — expires in 7 days
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={generatedUrl}
              className="flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs font-mono text-gray-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            The recipient must be signed in to accept the invite.
          </p>
        </div>
      )}
    </div>
  );
}
