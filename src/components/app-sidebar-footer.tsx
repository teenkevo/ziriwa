import { AppSidebarFooterClient } from '@/components/app-sidebar-footer-client'
import { isUserAdmin } from '@/lib/authz/guards.server'

export async function AppSidebarFooter() {
  const showAdmin = await isUserAdmin()
  return <AppSidebarFooterClient showAdmin={showAdmin} />
}
