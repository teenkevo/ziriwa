import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgWorkItemsListContent } from '@/features/org-work-items/org-work-items-list-content'
import { loadCommissionerAuditQueriesData } from '@/features/org-work-items/load-commissioner-audit-queries'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import {
  assertCommissionerWorkContext,
  ensureCommissionerPageAccess,
} from '@/features/manager/commissioner-workspace-page'

export default async function CommissionerAuditQueriesPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadCommissionerAuditQueriesData({ workContext })

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit queries</CardTitle>
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
      <OrgWorkItemsListContent
        mode='commissioner'
        itemKind='audit-queries'
        title='Audit Queries'
        subtitle='Manage audit queries for your department'
        actions={data.actions}
        divisions={data.divisions}
        basePath='/commissioner/audit-queries'
        apiPath='/api/audit-queries'
      />
    </OrgDelegationShell>
  )
}
