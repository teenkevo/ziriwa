import 'server-only'

import { getEffectiveAppRole } from '@/lib/authz/guards.server'
import { getCapabilitiesForRole } from '@/lib/authz/capabilities-client'
import type { Capabilities } from '@/lib/authz/types'

/** Server Components and Route Handlers — respects impersonation. */
export async function getCapabilities(): Promise<Capabilities> {
  const role = await getEffectiveAppRole()
  return getCapabilitiesForRole(role)
}
