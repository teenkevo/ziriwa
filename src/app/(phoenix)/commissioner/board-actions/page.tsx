import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionerBoardActionsContent } from '@/features/board-actions/commissioner-board-actions-content'
import { loadCommissionerBoardActionsData } from '@/features/board-actions/load-commissioner-board-actions'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import {
  assertCommissionerWorkContext,
  ensureCommissionerPageAccess,
} from '@/features/manager/commissioner-workspace-page'

export default async function CommissionerBoardActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadCommissionerBoardActionsData({ workContext })

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

  assertCommissionerWorkContext(
    workContext,
    Boolean(data.commissionerWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.commissionerWorkspace}>
      <CommissionerBoardActionsContent {...data} />
    </OrgDelegationShell>
  )
}
