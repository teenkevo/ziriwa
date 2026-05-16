import { NotAuthorized } from '@/components/admin/not-authorized'
import { AuditLogContent } from '@/features/admin/audit-log-content'
import { isUserAdmin } from '@/lib/authz/guards.server'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogPage() {
  const canView = await isUserAdmin()
  if (!canView) {
    return (
      <NotAuthorized
        title='Not authorized'
        description="You don't have access to the audit log."
        hint='System administrators and commissioner-level staff managers can view audit logs.'
      />
    )
  }

  return <AuditLogContent />
}
