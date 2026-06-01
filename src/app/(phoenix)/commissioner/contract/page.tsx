import { redirect } from 'next/navigation'

import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { CommissionerContractContent } from '@/features/manager/commissioner-contract-content'
import {
  assertCommissionerWorkContext,
  ensureCommissionerPageAccess,
} from '@/features/manager/commissioner-workspace-page'
import { loadCommissionerContractPageData } from '@/features/manager/load-commissioner-contract'

export default async function CommissionerContractPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadCommissionerContractPageData({ workContext })
  if (!data) redirect('/departments')

  assertCommissionerWorkContext(
    workContext,
    Boolean(data.commissionerWorkspace.delegation.assignmentAsDelegatee),
  )

  return (
    <OrgDelegationShell workspace={data.commissionerWorkspace}>
      <CommissionerContractContent {...data} />
    </OrgDelegationShell>
  )
}
