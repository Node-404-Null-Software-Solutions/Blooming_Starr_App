"use client";

import Link from "next/link";

type Props = {
  token: string;
  businessName: string;
  newOwnerEmail: string;
  signInUrl: string;
};

export function AcceptCoOwnerClient({ businessName }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Auth is disabled. Co-owner invite for <strong>{businessName}</strong> cannot be accepted in this mode.
      </p>
      <Link
        href="/app"
        className="inline-block rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Go to app
      </Link>
    </div>
  );
}
