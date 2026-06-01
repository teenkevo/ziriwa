import { redirect } from 'next/navigation'

import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { ensureAssistantCommissionerPageAccess } from '@/features/manager/assistant-commissioner-workspace-page'

export default async function AssistantCommissionerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  await ensureAssistantCommissionerPageAccess()
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const qs =
    workContext === 'acting' ? '?workContext=acting' : ''
  redirect(`/assistant-commissioner/dashboard${qs}`)
}
