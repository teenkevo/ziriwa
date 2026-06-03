import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return children
}
