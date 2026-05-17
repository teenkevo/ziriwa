import { redirect } from 'next/navigation'
import { getAppRole } from '@/lib/clerk-app-role.server'

export default async function WorkspacePage() {
  const role = await getAppRole()

  if (role === 'manager' || role === 'supervisor') {
    redirect('/manager/dashboard')
  }

  redirect('/departments')
}
