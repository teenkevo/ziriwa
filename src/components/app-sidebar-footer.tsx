import { AdminSidebarNavLink } from '@/components/admin/admin-sidebar-nav-link'
import { isUserAdmin } from '@/lib/authz/guards.server'

export async function AppSidebarFooter() {
  const show = await isUserAdmin()
  if (!show) return null

  return <AdminSidebarNavLink />
}
