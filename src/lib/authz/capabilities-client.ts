import type { AppRole } from '@/lib/app-role'
import { getRolePermissions } from '@/lib/authz/permissions'
import type { Capabilities } from '@/lib/authz/types'

const emptyCapabilities: Capabilities = {
  departments: { create: false, read: false, update: false, delete: false },
  divisions: { create: false, read: false, update: false, delete: false },
  sections: { create: false, read: false, update: false, delete: false },
  weeklySprints: { create: false, read: false, update: false, delete: false },
  staff: { create: false, read: false, update: false, delete: false },
  sprintTasks: { create: false, read: false, update: false, delete: false },
}

/** Client-safe: derives capabilities from a known role (no server imports). */
export function getCapabilitiesForRole(role: AppRole | null): Capabilities {
  if (!role) return emptyCapabilities
  return getRolePermissions(role) ?? emptyCapabilities
}
