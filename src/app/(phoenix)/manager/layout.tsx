import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { redirectProjectUserToProjectWorkspace } from '@/lib/workspace-redirect.server'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isProjects } = await getProjectWorkspaceContext()
  if (isProjects) {
    await redirectProjectUserToProjectWorkspace()
  } else {
    const role = await getAppRole()
    if (role === 'supervisor') {
      redirect('/supervisor/dashboard')
    }
    if (role === 'officer') {
      redirect('/officer/dashboard')
    }
  }

  return children
}
