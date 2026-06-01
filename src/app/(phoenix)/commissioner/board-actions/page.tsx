import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionerBoardActionsContent } from '@/features/board-actions/commissioner-board-actions-content'
import { loadCommissionerBoardActionsData } from '@/features/board-actions/load-commissioner-board-actions'

export default async function CommissionerBoardActionsPage() {
  const data = await loadCommissionerBoardActionsData()
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Board actions</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No commissioner department found for this account.
        </CardContent>
      </Card>
    )
  }

  return <CommissionerBoardActionsContent {...data} />
}
