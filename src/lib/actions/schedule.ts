"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessMembership } from "@/lib/authz";
import { appLogicFailureMessage } from "@/lib/app-logic-audit";
import {
  scheduleFromAppLogicScope,
  scheduleToAppLogicScope,
} from "@/lib/app-logic-row-mapping";
import { runDetailedAppLogicRowPipeline } from "@/lib/app-logic-row-service";
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
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Enter a valid date." };
  }

  const employee = await employees.findById(employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };
  let calculatedSchedule: {
    date: Date;
    startTime: string;
    endTime: string;
  };
  try {
    const execution = await runDetailedAppLogicRowPipeline(
      businessContext,
      "schedule",
      "INTERACTIVE",
      scheduleToAppLogicScope({ date, startTime, endTime })
    );
    calculatedSchedule = scheduleFromAppLogicScope(execution.scope);
  } catch (error) {
    return { ok: false, error: appLogicFailureMessage(error) };
  }

  await schedule.create({
    employeeId,
    ...calculatedSchedule,
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
  const existing = await schedule.findById(id);
  if (!existing) return { ok: false, error: "Entry not found." };
  const date = data.date === undefined ? existing.date : new Date(data.date);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Enter a valid date." };
  }
  const startTime = data.startTime ?? existing.startTime;
  const endTime = data.endTime ?? existing.endTime;
  try {
    const execution = await runDetailedAppLogicRowPipeline(
      businessContext,
      "schedule",
      "INTERACTIVE",
      scheduleToAppLogicScope({ date, startTime, endTime }),
      { sourceRowId: id }
    );
    const calculatedSchedule = scheduleFromAppLogicScope(execution.scope);
    updateData.date = calculatedSchedule.date;
    updateData.startTime = calculatedSchedule.startTime;
    updateData.endTime = calculatedSchedule.endTime;
  } catch (error) {
    return { ok: false, error: appLogicFailureMessage(error) };
  }
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
