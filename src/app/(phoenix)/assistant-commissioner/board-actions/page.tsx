import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantCommissionerBoardActionsContent } from '@/features/board-actions/assistant-commissioner-board-actions-content'
import { loadAssistantCommissionerBoardActionsData } from '@/features/board-actions/load-assistant-commissioner-board-actions'

export default async function AssistantCommissionerBoardActionsPage() {
  const data = await loadAssistantCommissionerBoardActionsData()
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Board actions</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No assistant commissioner division found for this account.
        </CardContent>
      </Card>
    )
  }

  return <AssistantCommissionerBoardActionsContent {...data} />
}
