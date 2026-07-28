import type { Role } from "@prisma/client";

export const OPERATION_MANAGER_ROLES = [
  "OWNER",
  "MANAGER",
] as const satisfies readonly Role[];

export function canManageOperations(role: Role) {
  return OPERATION_MANAGER_ROLES.includes(
    role as (typeof OPERATION_MANAGER_ROLES)[number],
  );
}
