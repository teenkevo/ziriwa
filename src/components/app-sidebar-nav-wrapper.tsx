import { getDepartmentsWithDivisionsForSidebar } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { AppSidebarNav } from '@/components/app-sidebar-nav'
import { ManagerSidebarNav } from '@/components/manager-sidebar-nav'

export async function AppSidebarNavWrapper() {
  const role = await getAppRole()

  if (role === 'manager' || role === 'supervisor') {
    return <ManagerSidebarNav />
  }

  const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
  return <AppSidebarNav departmentsTree={departmentsTree} />
}
