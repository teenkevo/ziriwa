import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { CommissionerStakeholderEngagementsContent } from '@/features/manager/commissioner-stakeholder-engagements-content'
import {
  assertCommissionerWorkContext,
  ensureCommissionerPageAccess,
} from '@/features/manager/commissioner-workspace-page'
import { loadCommissionerStakeholderEngagementsData } from '@/features/manager/load-commissioner-stakeholder-engagements'

export default async function CommissionerStakeholderEngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadCommissionerStakeholderEngagementsData({ workContext })

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stakeholder engagements</CardTitle>
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
      <CommissionerStakeholderEngagementsContent {...data} />
    </OrgDelegationShell>
  )
}
