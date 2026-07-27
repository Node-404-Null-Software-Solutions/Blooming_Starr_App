import type { AppLogicNumericScope } from "@/lib/app-logic-row-service";

const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_EPOCH_DAY = 3_652_058;

export type DateAppLogicFields = {
  date: Date | null;
  nextEarliest: Date | null;
  nextLatest: Date | null;
};

export function dateToEpochDays(value: Date | null | undefined): number {
  return value ? Math.floor(value.getTime() / MILLISECONDS_PER_DAY) : 0;
}

export function optionalDateFromEpochDays(
  value: number,
  field: string
): Date | null {
  const epochDay = Math.round(value);
  if (epochDay === 0) return null;
  if (epochDay < 0 || epochDay > MAX_EPOCH_DAY) {
    throw new Error(`${field} must be 0 or a valid UTC epoch-day value.`);
  }
  return new Date(epochDay * MILLISECONDS_PER_DAY);
}

export function dateFieldsToAppLogicScope(
  fields: DateAppLogicFields
): AppLogicNumericScope {
  return {
    dateEpochDays: dateToEpochDays(fields.date),
    nextEarliestEpochDays: dateToEpochDays(fields.nextEarliest),
    nextLatestEpochDays: dateToEpochDays(fields.nextLatest),
  };
}

export function dateFieldsFromAppLogicScope(
  scope: AppLogicNumericScope
): DateAppLogicFields {
  return {
    date: optionalDateFromEpochDays(scope.dateEpochDays, "dateEpochDays"),
    nextEarliest: optionalDateFromEpochDays(
      scope.nextEarliestEpochDays,
      "nextEarliestEpochDays"
    ),
    nextLatest: optionalDateFromEpochDays(
      scope.nextLatestEpochDays,
      "nextLatestEpochDays"
    ),
  };
}

export function timeToMinutes(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid stored schedule time: ${value}.`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid stored schedule time: ${value}.`);
  }
  return hours * 60 + minutes;
}

export function timeFromMinutes(value: number, field: string): string {
  const totalMinutes = Math.round(value);
  if (totalMinutes < 0 || totalMinutes >= 24 * 60) {
    throw new Error(`${field} must be between 0 and 1439.`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function scheduleToAppLogicScope(fields: {
  date: Date;
  startTime: string;
  endTime: string;
}): AppLogicNumericScope {
  return {
    dateEpochDays: dateToEpochDays(fields.date),
    startMinutes: timeToMinutes(fields.startTime),
    endMinutes: timeToMinutes(fields.endTime),
  };
}

export function scheduleFromAppLogicScope(scope: AppLogicNumericScope): {
  date: Date;
  startTime: string;
  endTime: string;
} {
  const date = optionalDateFromEpochDays(scope.dateEpochDays, "dateEpochDays");
  if (!date) throw new Error("dateEpochDays must identify a schedule date.");
  return {
    date,
    startTime: timeFromMinutes(scope.startMinutes, "startMinutes"),
    endTime: timeFromMinutes(scope.endMinutes, "endMinutes"),
  };
}
