import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantCommissionerBoardActionsContent } from '@/features/board-actions/assistant-commissioner-board-actions-content'
import { loadAssistantCommissionerBoardActionsData } from '@/features/board-actions/load-assistant-commissioner-board-actions'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import {
  assertAssistantCommissionerWorkContext,
  ensureAssistantCommissionerPageAccess,
} from '@/features/manager/assistant-commissioner-workspace-page'

export default async function AssistantCommissionerBoardActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureAssistantCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadAssistantCommissionerBoardActionsData({ workContext })

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

  assertAssistantCommissionerWorkContext(
    workContext,
    Boolean(data.acWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.acWorkspace}>
      <AssistantCommissionerBoardActionsContent {...data} />
    </OrgDelegationShell>
  )
}
