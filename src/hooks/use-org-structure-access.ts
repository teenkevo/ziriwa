'use client'

import { canCreateSection, hasRoleAtLeast, type AppRole } from '@/lib/app-role'
import { useViewer } from '@/contexts/viewer-context'
import { useAppRole } from '@/hooks/use-app-role'

function effectiveRole(
  role: AppRole | null,
  isSuperadmin: boolean,
  isImpersonating: boolean,
): AppRole | null {
  if (isSuperadmin && !isImpersonating) return 'commissioner_general'
  return role
}

/**
 * Client-side org structure permissions (departments, divisions, sections).
 * Superadmins (env allowlist) get commissioner_general-equivalent access.
 */
export function useOrgStructureAccess() {
  const { role, isLoaded } = useAppRole()
  const { isSuperadmin, isImpersonating } = useViewer()
  const effective = effectiveRole(role, isSuperadmin, isImpersonating)

  return {
    isLoaded,
    isSuperadmin,
    canManageDepartments: isLoaded && hasRoleAtLeast(effective, 'commissioner'),
    canManageDivisions: isLoaded && hasRoleAtLeast(effective, 'commissioner'),
    canCreateSection: isLoaded && canCreateSection(effective),
  }
}
