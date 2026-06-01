import { notFound } from 'next/navigation'

import { BoardActionPageContent } from '@/features/board-actions/board-action-page-content'
import { loadAssistantCommissionerBoardActionDetail } from '@/features/board-actions/load-assistant-commissioner-board-action-detail'

export default async function AssistantCommissionerBoardActionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadAssistantCommissionerBoardActionDetail(id)
  if (!data) notFound()

  return <BoardActionPageContent {...data} />
}
