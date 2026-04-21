import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorScreen message="Invalid or missing invite link." />;
  }

  const invite = await db.pendingMemberInvite.findUnique({ where: { token } });

  if (!invite) {
    return <ErrorScreen message="This invite link is invalid or has already been used." />;
  }

  if (invite.expiresAt < new Date()) {
    return <ErrorScreen message="This invite link has expired. Ask the owner to send a new one." />;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=/join?token=${token}`);
  }

  const business = await db.business.findUnique({
    where: { id: invite.businessId },
    select: { id: true, slug: true, name: true },
  });

  if (!business) {
    return <ErrorScreen message="The business associated with this invite no longer exists." />;
  }

  const existing = await db.membership.findFirst({
    where: { businessId: business.id, userId },
  });

  if (existing) {
    await db.profile.upsert({
      where: { userId },
      update: { activeBusinessId: business.id },
      create: { userId, activeBusinessId: business.id },
    });
    await db.pendingMemberInvite.delete({ where: { token } });
    redirect(`/app/${business.slug}`);
  }

  await db.$transaction([
    db.membership.create({
      data: {
        businessId: business.id,
        userId,
        role: invite.role,
        status: "ACTIVE",
      },
    }),
    db.profile.upsert({
      where: { userId },
      update: { activeBusinessId: business.id },
      create: { userId, activeBusinessId: business.id },
    }),
    db.pendingMemberInvite.delete({ where: { token } }),
  ]);

  redirect(`/app/${business.slug}`);
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f1]">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-bold text-gray-900">Unable to join</h1>
        <p className="text-sm text-gray-600">{message}</p>
        <Link
          href="/app"
          className="inline-block rounded-md bg-[#0E4D3A] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Go to app
        </Link>
      </div>
    </div>
  );
}
