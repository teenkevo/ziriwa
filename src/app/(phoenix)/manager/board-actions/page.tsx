import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'
import { OrgWorkItemsListContent } from '@/features/org-work-items/org-work-items-list-content'
import { loadSectionOrgWorkItemsList } from '@/features/org-work-items/load-section-org-work-item.server'

export default async function ManagerBoardActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionOrgWorkItemsList({
    role: 'manager',
    kind: 'board-actions',
  })

  if (!data) {
    return (
      <ManagerWorkspacePage view='dashboard' searchParams={searchParams} />
    )
  }

  return (
    <OrgWorkItemsListContent
      mode='section'
      itemKind='board-actions'
      title='Board Actions'
      subtitle='Board actions cascaded to your section'
      items={data.items}
      basePath='/manager/board-actions'
      roleLabel='Manager'
      dashboardHref='/manager/dashboard'
    />
  )
}
