/**
 * Application roles — keep in sync with `staff` schema ROLE_OPTIONS in Sanity.
 * Assign in Clerk: User → Public metadata → `{ "appRole": "<role>" }`.
 */
export const APP_ROLE_VALUES = [
  'commissioner_general',
  'commissioner',
  'assistant_commissioner',
  'manager',
  'supervisor',
  'officer',
] as const

export type AppRole = (typeof APP_ROLE_VALUES)[number]

/** Higher number = higher authority (for comparisons). */
const ROLE_RANK: Record<AppRole, number> = {
  commissioner_general: 60,
  commissioner: 50,
  assistant_commissioner: 40,
  manager: 30,
  supervisor: 20,
  officer: 10,
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLE_VALUES.includes(value as AppRole)
}

export function parseAppRole(value: unknown): AppRole | null {
  return isAppRole(value) ? value : null
}

/**
 * Read role from Clerk `publicMetadata` (key `appRole`).
 */
export function appRoleFromPublicMetadata(
  publicMetadata: Record<string, unknown> | null | undefined,
): AppRole | null {
  return parseAppRole(publicMetadata?.appRole)
}

/**
 * `role` has at least the authority of `minimum` (same rank or higher).
 */
export function hasRoleAtLeast(
  role: AppRole | null,
  minimum: AppRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

/** Optional Clerk JWT claim `app_role` (same values as `appRole` metadata). */
export function appRoleFromSessionClaims(
  claims: { app_role?: unknown } | null | undefined,
): AppRole | null {
  return parseAppRole(claims?.app_role)
}

/**
 * Create sections: assistant commissioners and commissioners (includes Commissioner General).
 * Excludes manager, supervisor, and officer.
 */
export function canCreateSection(role: AppRole | null): boolean {
  return hasRoleAtLeast(role, 'assistant_commissioner')
}
