import { cookies } from 'next/headers'
import { getAllDepartments } from '@/sanity/lib/departments/get-all-departments'
import { getDepartmentById } from '@/sanity/lib/departments/get-department-by-id'
import { getDivisionsByDepartment } from '@/sanity/lib/divisions/get-divisions-by-department'
import { DEPARTMENT_COOKIE_NAME } from '@/lib/division'
import { AppSidebarNav } from '@/components/app-sidebar-nav'

export async function AppSidebarNavWrapper() {
  const cookieStore = await cookies()
  const departmentIdCookie = cookieStore.get(DEPARTMENT_COOKIE_NAME)?.value

  let department = departmentIdCookie
    ? await getDepartmentById(departmentIdCookie)
    : null

  if (!department) {
    const allDepartments = await getAllDepartments()
    department =
      allDepartments.find(d => d.isDefault) || allDepartments[0] || null
  }

  const divisions = department
    ? await getDivisionsByDepartment(department._id)
    : []

  return <AppSidebarNav divisions={divisions} />
}
