import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { redirectProjectUserToProjectWorkspace } from '@/lib/workspace-redirect.server'

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ isProjects }, viewer] = await Promise.all([
    getProjectWorkspaceContext(),
    getViewerContext(),
  ])
  if (isProjects && !viewer.isImpersonating) {
    await redirectProjectUserToProjectWorkspace()
  } else {
    const role = await getAppRole()
    if (role === 'manager') {
      redirect('/manager/dashboard')
    }
    if (role === 'officer') {
      redirect('/officer/dashboard')
    }
  }

  return children
}
