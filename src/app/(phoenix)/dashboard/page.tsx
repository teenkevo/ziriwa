import DashboardPage from '@/features/dashboard/dashboard'
import { getAllDepartments } from '@/sanity/lib/departments/get-all-departments'
import { getDepartmentById } from '@/sanity/lib/departments/get-department-by-id'
import { getDivisionsByDepartment } from '@/sanity/lib/divisions/get-divisions-by-department'
import { getAssistantCommissionersAvailableForDepartment } from '@/sanity/lib/staff/get-assistant-commissioners'
import { getCommissionersUnassigned } from '@/sanity/lib/staff/get-commissioners'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import Loading from '../loading'
import { DEPARTMENT_COOKIE_NAME } from '@/lib/division'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const departmentIdCookie = cookieStore.get(DEPARTMENT_COOKIE_NAME)?.value

  const commissionersUnassigned = await getCommissionersUnassigned()

  let department = departmentIdCookie
    ? await getDepartmentById(departmentIdCookie)
    : null

  if (!department) {
    const allDepartments = await getAllDepartments()
    department =
      allDepartments.find(d => d.isDefault) || allDepartments[0] || null
  }

  const [divisions, assistantCommissioners] = await Promise.all([
    department ? getDivisionsByDepartment(department._id) : Promise.resolve([]),
    department
      ? getAssistantCommissionersAvailableForDepartment(department._id)
      : Promise.resolve([]),
  ])

  return (
    <Suspense fallback={<Loading />}>
      <DashboardPage
        divisions={divisions}
        department={department}
        assistantCommissioners={assistantCommissioners}
        commissioners={commissionersUnassigned}
      />
    </Suspense>
  )
}
