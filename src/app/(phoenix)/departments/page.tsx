import { getAllDepartmentsForList } from '@/sanity/lib/departments/get-all-departments-for-list'
import { getCommissionersForPicker } from '@/sanity/lib/staff/get-staff-for-picker'
import { DepartmentsListPage } from '@/features/departments/departments-list-page'

export default async function DepartmentsIndexPage() {
  const [departments, commissioners] = await Promise.all([
    getAllDepartmentsForList(),
    getCommissionersForPicker(),
  ])
  return (
    <DepartmentsListPage
      departments={departments}
      commissioners={commissioners}
    />
  )
}
