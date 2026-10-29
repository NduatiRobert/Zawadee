"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { firstFieldErrors } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

import { createFarmSchema } from "./schema";

/** Create the caller's farm (owner membership + settings) via the create_farm RPC. */
export async function createFarm(values: unknown): Promise<ActionResult> {
  const parsed = createFarmSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { name, location, currency, timezone } = parsed.data;
  const base = slugify(name) || "farm";
  const supabase = await createClient();

  let slug = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { error } = await supabase.rpc("create_farm", {
      p_name: name,
      p_slug: candidate,
      p_location: location ?? null,
      p_currency: currency,
      p_timezone: timezone,
    });

    if (!error) {
      slug = candidate;
      break;
    }
    // 23505 = unique_violation on the active-slug index: try the next suffix.
    if (error.code !== "23505") {
      return {
        ok: false,
        error: "Could not create the farm. Please try again.",
      };
    }
  }

  if (!slug) {
    return {
      ok: false,
      error: "That farm name is taken. Try a different name.",
    };
  }

  redirect(`/${slug}/dashboard`);
}
