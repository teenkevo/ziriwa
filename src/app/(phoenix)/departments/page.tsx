import { getAllDepartmentsForList } from '@/oracle/lib/departments/get-all-departments-for-list'
import { getCommissioners } from '@/oracle/lib/staff/get-commissioners'
import { DepartmentsListPage } from '@/features/departments/departments-list-page'

export default async function DepartmentsIndexPage() {
  const [departments, commissioners] = await Promise.all([
    getAllDepartmentsForList(),
    getCommissioners(),
  ])
  return (
    <DepartmentsListPage
      departments={departments}
      commissioners={commissioners}
    />
  )
}
