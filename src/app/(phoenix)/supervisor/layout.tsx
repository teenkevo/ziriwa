import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getAppRole()
  if (role === 'manager') {
    redirect('/manager/dashboard')
  }
  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  return children
}
