import { OrgWorkItemsListContent } from '@/features/org-work-items/org-work-items-list-content'
import { loadSectionOrgWorkItemsList } from '@/features/org-work-items/load-section-org-work-item.server'

async function SectionListPage({
  role,
  kind,
}: {
  role: 'supervisor' | 'officer'
  kind: 'board-actions' | 'audit-queries'
}) {
  const data = await loadSectionOrgWorkItemsList({ role, kind })
  const basePath = `/${role}/${kind}`
  const title = kind === 'board-actions' ? 'Board Actions' : 'Audit Queries'
  const subtitle =
    kind === 'board-actions'
      ? 'Board actions assigned to you'
      : 'Audit queries assigned to you'

  return (
    <OrgWorkItemsListContent
      mode='section'
      itemKind={kind}
      title={title}
      subtitle={subtitle}
      items={data?.items ?? []}
      basePath={basePath}
      roleLabel={role.charAt(0).toUpperCase() + role.slice(1)}
      dashboardHref={`/${role}/dashboard`}
    />
  )
}

export async function SupervisorBoardActionsPage() {
  return SectionListPage({ role: 'supervisor', kind: 'board-actions' })
}

export async function SupervisorAuditQueriesPage() {
  return SectionListPage({ role: 'supervisor', kind: 'audit-queries' })
}

export async function OfficerBoardActionsPage() {
  return SectionListPage({ role: 'officer', kind: 'board-actions' })
}

export async function OfficerAuditQueriesPage() {
  return SectionListPage({ role: 'officer', kind: 'audit-queries' })
}
