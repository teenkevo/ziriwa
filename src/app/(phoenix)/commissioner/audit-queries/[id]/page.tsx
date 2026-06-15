import { notFound } from 'next/navigation'

import { BoardActionPageContent } from '@/features/board-actions/board-action-page-content'
import { loadAuditQueryDetail } from '@/features/org-work-items/load-commissioner-audit-queries'
import { orgWorkItemCanApprove } from '@/lib/org-work-item/workflow'

export default async function CommissionerAuditQueryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadAuditQueryDetail(id)
  if (!data) notFound()

  return (
    <BoardActionPageContent
      {...data}
      canApprove={orgWorkItemCanApprove(data.action.status, 'commissioner')}
      canReject={orgWorkItemCanApprove(data.action.status, 'commissioner')}
    />
  )
}
