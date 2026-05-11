"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";

export async function createScheduleEntry(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { business } = await requireActiveMembership();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId) return { ok: false, error: "Employee is required." };
  if (!dateStr) return { ok: false, error: "Date is required." };
  if (!startTime || !endTime) return { ok: false, error: "Start and end times are required." };


  const employee = await db.employee.findFirst({
    where: { id: employeeId, businessId: business.id },
  });
  if (!employee) return { ok: false, error: "Employee not found." };

  await db.scheduleEntry.create({
    data: {
      businessId: business.id,
      employeeId,
      date: new Date(dateStr),
      startTime,
      endTime,
      title,
      notes,
    },
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
  const { business } = await requireActiveMembership();

  const existing = await db.scheduleEntry.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };

  const updateData: Record<string, unknown> = {};
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await db.scheduleEntry.update({ where: { id }, data: updateData });

  revalidatePath(`/app/${businessSlug}/schedule`);
  return { ok: true };
}

export async function deleteScheduleEntry(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireActiveMembership();

  const existing = await db.scheduleEntry.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return { ok: false, error: "Entry not found." };

  await db.scheduleEntry.delete({ where: { id } });

  revalidatePath(`/app/${businessSlug}/schedule`);
  return { ok: true };
}
