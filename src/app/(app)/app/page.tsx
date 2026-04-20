import { requireActiveMembership } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function AppEntryPage() {
  const { business } = await requireActiveMembership();
  redirect(`/app/${business.slug}`);
}
