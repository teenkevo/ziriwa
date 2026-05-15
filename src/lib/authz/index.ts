/**
 * Client-safe authz exports. For server-only helpers use `@/lib/authz/server`.
 */
export {
  APP_ROLE_LABELS,
  type AppRole,
  type Capabilities,
  type CrudAction,
  type CrudPermissions,
  type ResourceKey,
  type RolePermissions,
} from '@/lib/authz/types'

export {
  canCreateSection,
  canManageDepartments,
  canManageDivisions,
  canManageWeeklySprintDrafts,
  getRolePermissions,
  hasPermission,
  listRoles,
  ROLE_PERMISSIONS,
} from '@/lib/authz/permissions'

export { getCapabilitiesForRole } from '@/lib/authz/capabilities-client'

export { getSuperadminEmailWhitelist } from '@/lib/authz/env'
