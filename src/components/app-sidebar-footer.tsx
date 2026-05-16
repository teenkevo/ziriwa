import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav'
import { isUserAdmin } from '@/lib/authz/guards.server'

export async function AppSidebarFooter() {
  const show = await isUserAdmin()
  if (!show) return null

  return <AdminSidebarNav />
}
