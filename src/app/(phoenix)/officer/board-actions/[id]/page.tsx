import { SectionOrgWorkItemDetailPage } from '@/features/org-work-items/section-org-work-item-detail-page'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <SectionOrgWorkItemDetailPage
      itemId={id}
      role='officer'
      kind='board-actions'
    />
  )
}
