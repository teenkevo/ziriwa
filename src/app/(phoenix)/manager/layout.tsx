import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getAppRole()
  if (role === 'supervisor') {
    redirect('/supervisor/dashboard')
  }
  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  return children
}
