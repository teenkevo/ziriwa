import { notFound } from 'next/navigation'

import { BoardActionPageContent } from '@/features/board-actions/board-action-page-content'
import { loadAssistantCommissionerAuditQueryDetail } from '@/features/org-work-items/load-assistant-commissioner-audit-queries'

export default async function AssistantCommissionerAuditQueryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadAssistantCommissionerAuditQueryDetail(id)
  if (!data) notFound()

  return <BoardActionPageContent {...data} />
}
