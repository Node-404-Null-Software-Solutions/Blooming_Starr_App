"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessOperationManager } from "@/lib/authz";
import { createEmployeeRepository } from "@/lib/repositories/employee";

export async function createEmployee(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { businessContext } = await requireBusinessOperationManager(businessSlug);
  const employees = createEmployeeRepository(businessContext);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const hourlyRateCents = Math.round(parseFloat(String(formData.get("hourlyRate") ?? "0")) * 100) || 0;
  const salaryRateCents = Math.round(parseFloat(String(formData.get("salaryRate") ?? "0")) * 100) || 0;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await employees.create({
    name,
    email,
    phone,
    position,
    hourlyRateCents,
    salaryRateCents,
    notes,
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

function isValidCompensationCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export async function updateEmployee(
  id: string,
  businessSlug: string,
  data: EmployeeUpdate
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessOperationManager(businessSlug);
  if (
    (data.hourlyRateCents !== undefined &&
      !isValidCompensationCents(data.hourlyRateCents)) ||
    (data.salaryRateCents !== undefined &&
      !isValidCompensationCents(data.salaryRateCents))
  ) {
    return {
      ok: false,
      error: "Compensation must be a nonnegative whole-cent amount.",
    };
  }
  const employees = createEmployeeRepository(businessContext);
  const updated = await employees.updateById(id, data);
  if (!updated) return { ok: false, error: "Employee not found." };

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}

export async function deactivateEmployee(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessOperationManager(businessSlug);
  const employees = createEmployeeRepository(businessContext);
  const updated = await employees.updateById(id, { status: "INACTIVE" });
  if (!updated) return { ok: false, error: "Employee not found." };

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}

export async function reactivateEmployee(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessOperationManager(businessSlug);
  const employees = createEmployeeRepository(businessContext);
  const updated = await employees.updateById(id, { status: "ACTIVE" });
  if (!updated) return { ok: false, error: "Employee not found." };

  revalidatePath(`/app/${businessSlug}/employees`);
  return { ok: true };
}
