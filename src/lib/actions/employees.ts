"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";

export async function createEmployee(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { business } = await requireActiveMembership();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const hourlyRateCents = Math.round(parseFloat(String(formData.get("hourlyRate") ?? "0")) * 100) || 0;
  const salaryRateCents = Math.round(parseFloat(String(formData.get("salaryRate") ?? "0")) * 100) || 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await db.employee.create({
    data: {
      businessId: business.id,
      name,
      email,
      phone,
      position,
      hourlyRateCents,
      salaryRateCents,
      notes,
    },
  });

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}

type EmployeeUpdate = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  hourlyRateCents?: number;
  salaryRateCents?: number;
  notes?: string | null;
};

export async function updateEmployee(
  id: string,
  businessSlug: string,
  data: EmployeeUpdate
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireActiveMembership();

  const existing = await db.employee.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return { ok: false, error: "Employee not found." };

  await db.employee.update({ where: { id }, data });

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}

export async function deactivateEmployee(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireActiveMembership();

  const existing = await db.employee.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return { ok: false, error: "Employee not found." };

  await db.employee.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}

export async function reactivateEmployee(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireActiveMembership();

  const existing = await db.employee.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return { ok: false, error: "Employee not found." };

  await db.employee.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}
