import { redirect } from 'next/navigation'

import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'
import { getAppRole } from '@/lib/clerk-app-role.server'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const role = await getAppRole()
  if (role === 'assistant_commissioner') {
    redirect('/assistant-commissioner/dashboard')
  }
  if (role === 'commissioner') {
    redirect('/commissioner/dashboard')
  }

  return <ManagerWorkspacePage view='dashboard' searchParams={searchParams} />
}
