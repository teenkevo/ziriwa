import { notFound } from 'next/navigation'

import { OrgWorkItemsListContent } from '@/features/org-work-items/org-work-items-list-content'
import { loadAssistantCommissionerAuditQueries } from '@/features/org-work-items/load-assistant-commissioner-audit-queries'
import { ensureAssistantCommissionerPageAccess } from '@/features/manager/assistant-commissioner-workspace-page'

export default async function AssistantCommissionerAuditQueriesPage() {
  await ensureAssistantCommissionerPageAccess()
  const data = await loadAssistantCommissionerAuditQueries()
  if (!data) notFound()

  return (
    <OrgWorkItemsListContent
      mode='commissioner'
      itemKind='audit-queries'
      title='Audit Queries'
      subtitle={`Audit queries for ${data.divisionName}`}
      actions={data.actions}
      divisions={[]}
      basePath='/assistant-commissioner/audit-queries'
      apiPath='/api/audit-queries'
      canCreate={false}
    />
  )
}
