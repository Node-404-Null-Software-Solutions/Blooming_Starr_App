import { redirect } from "next/navigation";

export default async function FormulasRedirectPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  redirect(`/app/${businessSlug}/settings/app-logic`);
}
