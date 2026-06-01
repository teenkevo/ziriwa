import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { CommissionerDashboardContent } from '@/features/manager/commissioner-dashboard-content'
import {
  assertCommissionerWorkContext,
  ensureCommissionerPageAccess,
} from '@/features/manager/commissioner-workspace-page'
import { loadCommissionerDashboardData } from '@/features/manager/load-commissioner-dashboard'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadCommissionerDashboardData({ workContext })

  if (!data) {
    return (
      <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
        <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-2xl font-bold'>Dashboard</h1>
            <p className='max-w-3xl text-sm text-muted-foreground'>
              Department contract progress, active sprints, and stakeholder
              reporting.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Commissioner dashboard</CardTitle>
            </CardHeader>
            <CardContent className='text-sm text-muted-foreground'>
              No department has been assigned to this commissioner account.
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  assertCommissionerWorkContext(
    workContext,
    Boolean(data.commissionerWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.commissionerWorkspace}>
      <CommissionerDashboardContent data={data} />
    </OrgDelegationShell>
  )
}
