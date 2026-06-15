import { notFound } from 'next/navigation'

import { BoardActionPageContent } from '@/features/board-actions/board-action-page-content'
import { loadBoardActionDetail } from '@/features/board-actions/load-board-action-detail'
import { orgWorkItemCanApprove } from '@/lib/org-work-item/workflow'

export default async function CommissionerBoardActionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadBoardActionDetail(id)
  if (!data) notFound()

  return (
    <BoardActionPageContent
      {...data}
      canApprove={orgWorkItemCanApprove(data.action.status, 'commissioner')}
      canReject={orgWorkItemCanApprove(data.action.status, 'commissioner')}
    />
  )
}
