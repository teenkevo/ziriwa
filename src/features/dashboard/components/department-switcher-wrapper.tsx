import { cookies } from 'next/headers'
import { getAllDepartments } from '@/sanity/lib/departments/get-all-departments'
import { getCommissionersUnassigned } from '@/sanity/lib/staff/get-commissioners'
import DepartmentSwitcher from './department-switcher'
import { DEPARTMENT_COOKIE_NAME } from '@/lib/division'

export async function DepartmentSwitcherWrapper() {
  const [departments, commissioners, cookieStore] = await Promise.all([
    getAllDepartments(),
    getCommissionersUnassigned(),
    cookies(),
  ])

  const storedId = cookieStore.get(DEPARTMENT_COOKIE_NAME)?.value
  const selectedId =
    storedId && departments.some(d => d._id === storedId)
      ? storedId
      : departments.find(d => d.isDefault)?._id || departments[0]?._id || ''

  return (
    <DepartmentSwitcher
      departments={departments}
      commissioners={commissioners}
      selectedId={selectedId}
      className='w-full'
    />
  )
}
