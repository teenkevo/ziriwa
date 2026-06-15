import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'
import { OrgWorkItemsListContent } from '@/features/org-work-items/org-work-items-list-content'
import { loadSectionOrgWorkItemsList } from '@/features/org-work-items/load-section-org-work-item.server'

export default async function ManagerAuditQueriesPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionOrgWorkItemsList({
    role: 'manager',
    kind: 'audit-queries',
  })

  if (!data) {
    return (
      <ManagerWorkspacePage view='dashboard' searchParams={searchParams} />
    )
  }

  return (
    <OrgWorkItemsListContent
      mode='section'
      itemKind='audit-queries'
      title='Audit Queries'
      subtitle='Audit queries cascaded to your section'
      items={data.items}
      basePath='/manager/audit-queries'
      roleLabel='Manager'
      dashboardHref='/manager/dashboard'
    />
  )
}
