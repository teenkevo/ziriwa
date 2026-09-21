import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { redirectProjectUserToProjectWorkspace } from '@/lib/workspace-redirect.server'

export default async function OfficerLayout({
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
    if (role === 'supervisor') {
      redirect('/supervisor/dashboard')
    }
    if (role === 'assistant_commissioner') {
      redirect('/assistant-commissioner/dashboard')
    }
    if (role === 'commissioner') {
      redirect('/commissioner/dashboard')
    }
  }

  return children
}
