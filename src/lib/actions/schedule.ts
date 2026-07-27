"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessMembership } from "@/lib/authz";
import { createEmployeeRepository } from "@/lib/repositories/employee";
import {
  createScheduleEntryRepository,
  type TenantScheduleEntryUpdateInput,
} from "@/lib/repositories/schedule-entry";

export async function createScheduleEntry(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const employees = createEmployeeRepository(businessContext);
  const schedule = createScheduleEntryRepository(businessContext);

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId) return { ok: false, error: "Employee is required." };
  if (!dateStr) return { ok: false, error: "Date is required." };
  if (!startTime || !endTime) return { ok: false, error: "Start and end times are required." };

  const employee = await employees.findById(employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  await schedule.create({
    employeeId,
    date: new Date(dateStr),
    startTime,
    endTime,
    title,
    notes,
  });

  revalidatePath(`/app/${businessSlug}/schedule`);
  return { ok: true };
}

export async function updateScheduleEntry(
  id: string,
  businessSlug: string,
  data: {
    employeeId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string | null;
    notes?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const employees = createEmployeeRepository(businessContext);
  const schedule = createScheduleEntryRepository(businessContext);

  const updateData: TenantScheduleEntryUpdateInput = {};
  if (data.employeeId !== undefined) {
    const employee = await employees.findById(data.employeeId);
    if (!employee) return { ok: false, error: "Employee not found." };
    updateData.employeeId = data.employeeId;
  }
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await schedule.updateById(id, updateData);
  if (!updated) return { ok: false, error: "Entry not found." };

  revalidatePath(`/app/${businessSlug}/schedule`);
  return { ok: true };
}

export async function deleteScheduleEntry(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const schedule = createScheduleEntryRepository(businessContext);
  const deleted = await schedule.deleteById(id);
  if (!deleted) return { ok: false, error: "Entry not found." };

  revalidatePath(`/app/${businessSlug}/schedule`);
  return { ok: true };
}
