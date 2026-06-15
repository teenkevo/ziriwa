import { notFound } from 'next/navigation'

import { BoardActionPageContent } from '@/features/board-actions/board-action-page-content'
import { loadSectionOrgWorkItemDetail } from '@/features/org-work-items/load-section-org-work-item.server'

export async function SectionOrgWorkItemDetailPage({
  itemId,
  role,
  kind,
}: {
  itemId: string
  role: 'manager' | 'supervisor' | 'officer'
  kind: 'board-actions' | 'audit-queries'
}) {
  const data = await loadSectionOrgWorkItemDetail({ itemId, role, kind })
  if (!data) notFound()
  return <BoardActionPageContent {...data} />
}
