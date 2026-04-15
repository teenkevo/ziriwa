import { getDepartmentsWithDivisionsForSidebar } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import { AppSidebarNav } from '@/components/app-sidebar-nav'

export async function AppSidebarNavWrapper() {
  const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
  return <AppSidebarNav departmentsTree={departmentsTree} />
}
