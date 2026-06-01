import { redirect } from 'next/navigation'

import { ensureAssistantCommissionerPageAccess } from '@/features/manager/assistant-commissioner-workspace-page'

export default async function AssistantCommissionerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await ensureAssistantCommissionerPageAccess()
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    redirect('/workspace')
  }

  return children
}
