'use client'

import { canCreateSection, hasRoleAtLeast, type AppRole } from '@/lib/app-role'
import { useViewer } from '@/contexts/viewer-context'
import { useAppRole } from '@/hooks/use-app-role'

function effectiveRole(
  role: AppRole | null,
  isSuperadmin: boolean,
): AppRole | null {
  return isSuperadmin ? 'commissioner_general' : role
}

/**
 * Client-side org structure permissions (departments, divisions, sections).
 * Superadmins (env allowlist) get commissioner_general-equivalent access.
 */
export function useOrgStructureAccess() {
  const { role, isLoaded } = useAppRole()
  const { isSuperadmin } = useViewer()
  const effective = effectiveRole(role, isSuperadmin)

  return {
    isLoaded,
    isSuperadmin,
    canManageDepartments: isLoaded && hasRoleAtLeast(effective, 'commissioner'),
    canManageDivisions: isLoaded && hasRoleAtLeast(effective, 'commissioner'),
    canCreateSection: isLoaded && canCreateSection(effective),
  }
}
