import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");


  const membership = await db.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { businessId: true, business: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (membership) {
    await db.profile.upsert({
      where: { userId },
      update: { activeBusinessId: membership.businessId },
      create: { userId, activeBusinessId: membership.businessId },
    });
    redirect(`/app/${membership.business.slug}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f1]">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0E4D3A]">Welcome to Bloomingstarr</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your business to get started.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
