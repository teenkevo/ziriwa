import { CommissionerDashboardContent } from '@/features/manager/commissioner-dashboard-content'
import { loadCommissionerDashboardData } from '@/features/manager/load-commissioner-dashboard'
import { redirect } from 'next/navigation'

export default async function CommissionerReportsPage() {
  const data = await loadCommissionerDashboardData()
  if (!data) redirect('/departments')

  return <CommissionerDashboardContent data={data} />
}
