"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { firstFieldErrors } from "@/lib/action-result";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getFarmContext } from "@/features/farms/queries";

import { inviteSchema } from "./schema";

/** Owner invites a teammate by email. The DB enforces owner-only insert. */
export async function inviteMember(
  farmSlug: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const ctx = await getFarmContext(farmSlug);
  if (!ctx || !can(ctx.role, "members:manage")) {
    return { ok: false, error: "You don't have permission to invite members." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    farm_id: ctx.farm.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That email already has a pending invitation.",
      };
    }
    return {
      ok: false,
      error: "Could not send the invitation. Please try again.",
    };
  }

  revalidatePath(`/${farmSlug}/team`);
  return { ok: true, data: undefined };
}

/** Owner revokes a pending invitation. */
export async function revokeInvitation(
  farmSlug: string,
  invitationId: string,
): Promise<ActionResult> {
  const ctx = await getFarmContext(farmSlug);
  if (!ctx || !can(ctx.role, "members:manage")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("farm_id", ctx.farm.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Could not revoke the invitation." };

  revalidatePath(`/${farmSlug}/team`);
  return { ok: true, data: undefined };
}

/** Accept an invitation token (SECURITY DEFINER RPC), then go to the farm. */
export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: member, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (error || !member) {
    return {
      ok: false,
      error: "This invitation is invalid, expired, or for a different email.",
    };
  }

  const { data: farm } = await supabase
    .from("farms")
    .select("slug")
    .eq("id", member.farm_id)
    .maybeSingle();

  if (!farm) {
    return {
      ok: false,
      error: "Could not open the farm. Please sign in again.",
    };
  }

  redirect(`/${farm.slug}/dashboard`);
}
