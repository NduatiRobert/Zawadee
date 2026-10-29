import { z } from "zod";

/** Create-farm form (onboarding). Slug is derived server-side from the name. */
export const createFarmSchema = z.object({
  name: z.string().trim().min(2, "Farm name is required").max(120),
  location: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code")
    .default("KES"),
  timezone: z.string().trim().min(1).default("Africa/Nairobi"),
});
export type CreateFarmInput = z.infer<typeof createFarmSchema>;
