import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantCommissionerStakeholderEngagementsContent } from '@/features/manager/assistant-commissioner-stakeholder-engagements-content'
import { loadAssistantCommissionerStakeholderEngagementsData } from '@/features/manager/load-assistant-commissioner-stakeholder-engagements'

export default async function AssistantCommissionerStakeholderEngagementsPage() {
  const data = await loadAssistantCommissionerStakeholderEngagementsData()
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stakeholder engagements</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No assistant commissioner division found for this account.
        </CardContent>
      </Card>
    )
  }

  return <AssistantCommissionerStakeholderEngagementsContent {...data} />
}
