import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { AssistantCommissionerContractContent } from '@/features/manager/assistant-commissioner-contract-content'
import {
  assertAssistantCommissionerWorkContext,
  ensureAssistantCommissionerPageAccess,
} from '@/features/manager/assistant-commissioner-workspace-page'
import { loadAssistantCommissionerContractPageData } from '@/features/manager/load-assistant-commissioner-contract'

export default async function AssistantCommissionerContractPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureAssistantCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadAssistantCommissionerContractPageData({ workContext })

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
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
      <AssistantCommissionerContractContent {...data} />
    </OrgDelegationShell>
  )
}
