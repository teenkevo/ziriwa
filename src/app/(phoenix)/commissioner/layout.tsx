import { redirect } from 'next/navigation'

import { ensureCommissionerPageAccess } from '@/features/manager/commissioner-workspace-page'

export default async function CommissionerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await ensureCommissionerPageAccess()
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    redirect('/workspace')
  }

  return children
}
