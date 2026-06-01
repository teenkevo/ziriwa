import { redirect } from 'next/navigation'

import { AssistantCommissionerDashboardContent } from '@/features/manager/assistant-commissioner-dashboard-content'
import { loadAssistantCommissionerDashboardData } from '@/features/manager/load-assistant-commissioner-dashboard'

export default async function AssistantCommissionerReportsPage() {
  const data = await loadAssistantCommissionerDashboardData()
  if (!data) redirect('/departments')

  return <AssistantCommissionerDashboardContent data={data} />
}
