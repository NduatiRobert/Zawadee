import { z } from "zod";

import { FARM_ROLES } from "@/lib/permissions";

/** Invite a teammate to the farm by email with a role. */
export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .toLowerCase(),
  role: z.enum(FARM_ROLES),
});
export type InviteInput = z.infer<typeof inviteSchema>;
