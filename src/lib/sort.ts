
export function sortByDateDescNullsLast<T extends { date: Date | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const aTime = a.date ? a.date.getTime() : null;
    const bTime = b.date ? b.date.getTime() : null;
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });
}
