import { notFound, redirect } from 'next/navigation'

import { OrgDelegationShell } from '@/features/delegation/org-delegation-shell'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { canAccessAssistantCommissionerWorkspace } from '@/lib/assistant-commissioner-workspace.server'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function ensureAssistantCommissionerPageAccess() {
  const role = await getAppRole()
  if (role === 'commissioner') {
    redirect('/commissioner/dashboard')
  }
  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  const canAccess = await canAccessAssistantCommissionerWorkspace()
  if (!canAccess) {
    if (role === 'manager') {
      redirect('/manager/dashboard')
    }
    if (role === 'supervisor') {
      redirect('/supervisor/dashboard')
    }
    redirect('/workspace')
  }
}

export function assertAssistantCommissionerWorkContext(
  workContext: ReturnType<typeof parseWorkContextParam>,
  hasActingAssignment: boolean,
) {
  if (workContext === 'acting' && !hasActingAssignment) {
    notFound()
  }
}
