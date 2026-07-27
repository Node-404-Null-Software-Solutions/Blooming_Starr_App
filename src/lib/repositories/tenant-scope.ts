export function withBusinessScope<TWhere extends object>(
  businessId: string,
  where?: TWhere
): { businessId: string } | { AND: [{ businessId: string }, TWhere] } {
  if (!where) return { businessId };
  return { AND: [{ businessId }, where] };
}

export function withBusinessData<TData extends object>(
  businessId: string,
  data: TData
): TData & { businessId: string } {
  return { ...data, businessId };
}
