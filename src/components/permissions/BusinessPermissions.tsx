"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@prisma/client";
import { canManageOperations } from "@/lib/permissions";

const BusinessRoleContext = createContext<Role>("EMPLOYEE");

export function BusinessPermissionsProvider({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  return (
    <BusinessRoleContext.Provider value={role}>
      {children}
    </BusinessRoleContext.Provider>
  );
}

export function useBusinessPermissions() {
  const role = useContext(BusinessRoleContext);
  return {
    role,
    canManageOperations: canManageOperations(role),
  };
}

export function CanManageOperations({ children }: { children: ReactNode }) {
  const permissions = useBusinessPermissions();
  return permissions.canManageOperations ? <>{children}</> : null;
}
