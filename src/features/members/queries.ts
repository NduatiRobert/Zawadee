import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type Member = {
  id: string;
  userId: string;
  fullName: string;
  role: Enums<"farm_role">;
  status: Enums<"member_status">;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: Enums<"farm_role">;
  expiresAt: string;
};

/** Active members of a farm, with their profile name. */
export async function listMembers(farmId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_members")
    .select("id, user_id, role, status, profile:profiles!inner(full_name)")
    .eq("farm_id", farmId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.profile.full_name || "(unnamed)",
    role: row.role,
    status: row.status,
  }));
}

/** Pending invitations for a farm. */
export async function listPendingInvitations(
  farmId: string,
): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at")
    .eq("farm_id", farmId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
  }));
}
