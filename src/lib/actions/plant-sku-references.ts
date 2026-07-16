"use server";

import { db } from "@/lib/db";
import { requireBusinessMembership } from "@/lib/authz";
import {
  createSkuReference,
  duplicateSkuReferenceMessage,
  updateSkuReference,
} from "@/lib/plant-sku-service";
import { revalidatePath } from "next/cache";

export type PlantSkuReferenceRow = {
  id: string;
  scope: string;
  displayName: string;
  normalizedName: string;
  code: string;
  active: boolean;
  notes: string | null;
};

export async function getPlantSkuReferences(businessSlug: string): Promise<PlantSkuReferenceRow[]> {
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;

  return db.plantSkuReference.findMany({
    where: { businessId },
    select: {
      id: true,
      scope: true,
      displayName: true,
      normalizedName: true,
      code: true,
      active: true,
      notes: true,
    },
    orderBy: [{ scope: "asc" }, { displayName: "asc" }],
  });
}

export async function createPlantSkuReference(
  businessSlug: string,
  data: { scope: string; displayName: string; code: string; notes?: string | null }
) {
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;

  try {
    await createSkuReference(db, businessId, {
      scope: data.scope,
      displayName: data.displayName,
      code: data.code,
      notes: data.notes,
      active: true,
    });
  } catch (error) {
    return { ok: false, error: duplicateSkuReferenceMessage(error) ?? String((error as Error).message ?? "Failed to create") };
  }

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export async function updatePlantSkuReference(
  id: string,
  businessSlug: string,
  data: { displayName?: string; code?: string; active?: boolean; notes?: string | null }
) {
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;

  try {
    await updateSkuReference(db, businessId, id, data);
  } catch (error) {
    return { ok: false, error: duplicateSkuReferenceMessage(error) ?? String((error as Error).message ?? "Failed to update") };
  }

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export async function deactivatePlantSkuReference(id: string, businessSlug: string) {
  return updatePlantSkuReference(id, businessSlug, { active: false });
}
