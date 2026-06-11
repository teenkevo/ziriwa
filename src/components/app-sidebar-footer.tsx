import { AppSidebarFooterClient } from '@/components/app-sidebar-footer-client'
import { isSuperadmin, isUserAdmin } from '@/lib/authz/guards.server'

export async function AppSidebarFooter() {
  const [showAdmin, showImpersonate] = await Promise.all([
    isUserAdmin(),
    isSuperadmin(),
  ])
  return (
    <AppSidebarFooterClient
      showAdmin={showAdmin}
      showImpersonate={showImpersonate}
    />
  )
}
