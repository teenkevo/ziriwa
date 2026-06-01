import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantCommissionerDashboardContent } from '@/features/manager/assistant-commissioner-dashboard-content'
import { loadAssistantCommissionerDashboardData } from '@/features/manager/load-assistant-commissioner-dashboard'

export default async function Page() {
  const data = await loadAssistantCommissionerDashboardData()

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assistant commissioner dashboard</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No division has been assigned to this assistant commissioner account.
        </CardContent>
      </Card>
    )
  }

  return <AssistantCommissionerDashboardContent data={data} />
}
