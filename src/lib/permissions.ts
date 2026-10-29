/**
 * Permission matrix — the single source of truth for the UI.
 *
 * This mirrors the SQL RLS policies (the real guard). Reading any row of a
 * farm is allowed for every active member, so reads are not modelled here;
 * this file covers write/manage capabilities only, used to hide or disable
 * actions in the UI. The database still enforces every rule.
 *
 * Each phase extends `CAPABILITY_ROLES` alongside the migration that adds the
 * matching policies. Phase 1 covers tenancy: members, invitations, settings,
 * billing and the audit log. See CLAUDE.md (role matrix) and
 * docs/PROMPT.md (Multi-tenancy, auth, roles and RLS).
 */

export const FARM_ROLES = [
  "owner",
  "manager",
  "vet",
  "worker",
  "accountant",
] as const;
export type FarmRole = (typeof FARM_ROLES)[number];

export const ROLE_LABELS: Record<FarmRole, string> = {
  owner: "Owner",
  manager: "Manager",
  vet: "Vet",
  worker: "Worker",
  accountant: "Accountant",
};

/**
 * Capabilities enforced in Phase 1. Values are the roles allowed to perform
 * the action; the owner is included explicitly rather than special-cased.
 */
export const CAPABILITY_ROLES = {
  /** Add/remove members, change roles, create/revoke invitations. */
  "members:manage": ["owner"],
  /** See the farm's pending and past invitations. */
  "invitations:view": ["owner", "manager"],
  /** Edit farm profile and farm_settings. */
  "settings:manage": ["owner", "manager"],
  /** Billing / subscription (owner only). */
  "billing:manage": ["owner"],
  /** View the farm's audit log. */
  "audit:view": ["owner", "manager"],
} as const satisfies Record<string, readonly FarmRole[]>;

export type Capability = keyof typeof CAPABILITY_ROLES;

/** True when `role` is allowed to perform `capability`. */
export function can(role: FarmRole, capability: Capability): boolean {
  return (CAPABILITY_ROLES[capability] as readonly FarmRole[]).includes(role);
}

/** True when `role` is one of `roles`. Narrow helper for UI guards. */
export function hasAnyRole(
  role: FarmRole,
  roles: readonly FarmRole[],
): boolean {
  return roles.includes(role);
}

/** Type guard: is an arbitrary string a known farm role? */
export function isFarmRole(value: string): value is FarmRole {
  return (FARM_ROLES as readonly string[]).includes(value);
}
