import type { Role } from "@prisma/client";

const businessContextBrand = Symbol("BusinessContext");

export type BusinessContext = Readonly<{
  requestId: string;
  userId: string;
  membershipId: string;
  businessId: string;
  businessSlug: string;
  role: Role;
  [businessContextBrand]: true;
}>;

type BusinessContextInput = {
  requestId: string;
  userId: string;
  membershipId: string;
  businessId: string;
  businessSlug: string;
  role: Role;
};

function requireValue(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Cannot create business context without ${field}.`);
  }
  return normalized;
}

export function createBusinessContext(
  input: BusinessContextInput
): BusinessContext {
  const context = {
    requestId: requireValue(input.requestId, "a request ID"),
    userId: requireValue(input.userId, "a user ID"),
    membershipId: requireValue(input.membershipId, "a membership ID"),
    businessId: requireValue(input.businessId, "a business ID"),
    businessSlug: requireValue(input.businessSlug, "a business slug"),
    role: input.role,
    [businessContextBrand]: true as const,
  };

  Object.defineProperty(context, businessContextBrand, { enumerable: false });
  return Object.freeze(context);
}
