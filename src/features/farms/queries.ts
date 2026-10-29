import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type FarmSummary = Pick<Tables<"farms">, "id" | "name" | "slug"> & {
  role: Enums<"farm_role">;
};

export type FarmContext = {
  farm: Tables<"farms">;
  role: Enums<"farm_role">;
};

/** Farms the signed-in user is an active member of (for the farm switcher). */
export async function listMyFarms(): Promise<FarmSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_members")
    .select("role, farm:farms!inner(id, name, slug, deleted_at)")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data
    .filter((row) => row.farm && row.farm.deleted_at === null)
    .map((row) => ({
      id: row.farm.id,
      name: row.farm.name,
      slug: row.farm.slug,
      role: row.role,
    }));
}

/**
 * Resolve a farm by slug for the current user. Returns null when the farm does
 * not exist or the user is not an active member (RLS hides non-member farms).
 */
export async function getFarmContext(
  slug: string,
): Promise<FarmContext | null> {
  const supabase = await createClient();

  const { data: farm, error } = await supabase
    .from("farms")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !farm) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("farm_members")
    .select("role")
    .eq("farm_id", farm.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!member) return null;

  return { farm, role: member.role };
}
