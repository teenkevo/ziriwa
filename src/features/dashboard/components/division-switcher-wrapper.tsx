import { cookies } from 'next/headers'
import { getAssistantCommissioners } from '@/sanity/lib/staff/get-assistant-commissioners'
import { getDepartmentById } from '@/oracle/lib/departments/get-department-by-id'
import { getAllDepartments } from '@/oracle/lib/departments/get-all-departments'
import { getDivisionsByDepartment } from '@/sanity/lib/divisions/get-divisions-by-department'
import DivisionSwitcher from './division-switcher'
import {
  DEPARTMENT_COOKIE_NAME,
  DIVISION_COOKIE_NAME,
} from '@/lib/division'

export async function DivisionSwitcherWrapper() {
  const cookieStore = await cookies()

  const departmentCookieId = cookieStore.get(DEPARTMENT_COOKIE_NAME)?.value

  let department = departmentCookieId
    ? await getDepartmentById(departmentCookieId)
    : null

  if (!department) {
    const allDepartments = await getAllDepartments()
    department =
      allDepartments.find(d => d.isDefault) || allDepartments[0] || null
  }

  if (!department) {
    return null
  }

  const [divisions, assistantCommissioners] = await Promise.all([
    getDivisionsByDepartment(department._id),
    getAssistantCommissioners(),
  ])

  const storedDivisionId = cookieStore.get(DIVISION_COOKIE_NAME)?.value
  const selectedId =
    storedDivisionId && divisions.some(d => d._id === storedDivisionId)
      ? storedDivisionId
      : divisions.find(d => d.isDefault)?._id || divisions[0]?._id || ''

  return (
    <DivisionSwitcher
      divisions={divisions}
      assistantCommissioners={assistantCommissioners}
      selectedId={selectedId}
      departmentId={department._id}
      departmentName={department.name}
      className='w-full'
    />
  )
}
