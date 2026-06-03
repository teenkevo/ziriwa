import { notFound, redirect } from 'next/navigation'

import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { canAccessCommissionerWorkspace } from '@/lib/commissioner-workspace.server'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function ensureCommissionerPageAccess() {
  const role = await getAppRole()
  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  const canAccess = await canAccessCommissionerWorkspace()
  if (!canAccess) {
    if (role === 'assistant_commissioner') {
      redirect('/assistant-commissioner/dashboard')
    }
    if (role === 'manager') {
      redirect('/manager/dashboard')
    }
    if (role === 'supervisor') {
      redirect('/supervisor/dashboard')
    }
    redirect('/workspace')
  }
}

export function assertCommissionerWorkContext(
  workContext: ReturnType<typeof parseWorkContextParam>,
  hasActingAssignment: boolean,
) {
  if (workContext === 'acting' && !hasActingAssignment) {
    notFound()
  }
}
