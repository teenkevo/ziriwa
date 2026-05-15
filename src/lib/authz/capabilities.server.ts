import 'server-only'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getCapabilitiesForRole } from '@/lib/authz/capabilities-client'
import type { Capabilities } from '@/lib/authz/types'

/** Server Components and Route Handlers — resolves role from Clerk. */
export async function getCapabilities(): Promise<Capabilities> {
  const role = await getAppRole()
  return getCapabilitiesForRole(role)
}
