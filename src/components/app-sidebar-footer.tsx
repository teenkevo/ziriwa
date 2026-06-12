import { AppSidebarFooterClient } from '@/components/app-sidebar-footer-client'
import { isSuperadmin, isUserAdmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function AppSidebarFooter() {
  const [showAdmin, showImpersonate, role] = await Promise.all([
    isUserAdmin(),
    isSuperadmin(),
    getAppRole(),
  ])
  const showSprintEmailTest = role === 'manager'

  return (
    <AppSidebarFooterClient
      showAdmin={showAdmin}
      showImpersonate={showImpersonate}
      showSprintEmailTest={showSprintEmailTest}
    />
  )
}
