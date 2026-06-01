import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { AssistantCommissionerDashboardContent } from '@/features/manager/assistant-commissioner-dashboard-content'
import {
  assertAssistantCommissionerWorkContext,
  ensureAssistantCommissionerPageAccess,
} from '@/features/manager/assistant-commissioner-workspace-page'
import { loadAssistantCommissionerDashboardData } from '@/features/manager/load-assistant-commissioner-dashboard'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureAssistantCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadAssistantCommissionerDashboardData({ workContext })

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

  assertAssistantCommissionerWorkContext(
    workContext,
    Boolean(data.acWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.acWorkspace}>
      <AssistantCommissionerDashboardContent data={data} />
    </OrgDelegationShell>
  )
}
