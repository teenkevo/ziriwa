import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { AssistantCommissionerStakeholderEngagementsContent } from '@/features/manager/assistant-commissioner-stakeholder-engagements-content'
import {
  assertAssistantCommissionerWorkContext,
  ensureAssistantCommissionerPageAccess,
} from '@/features/manager/assistant-commissioner-workspace-page'
import { loadAssistantCommissionerStakeholderEngagementsData } from '@/features/manager/load-assistant-commissioner-stakeholder-engagements'

export default async function AssistantCommissionerStakeholderEngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureAssistantCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadAssistantCommissionerStakeholderEngagementsData({
    workContext,
  })

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

  assertAssistantCommissionerWorkContext(
    workContext,
    Boolean(data.acWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.acWorkspace}>
      <AssistantCommissionerStakeholderEngagementsContent {...data} />
    </OrgDelegationShell>
  )
}
