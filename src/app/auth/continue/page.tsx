import { redirect } from 'next/navigation'

import { AuthContinueClient } from '@/app/auth/continue/auth-continue-client'

export const dynamic = 'force-dynamic'

/** Post-sign-in routing: show loader immediately, then resolve workspace via API. */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{
    __clerk_ticket?: string
    __clerk_status?: string
  }>
}) {
  const params = await searchParams
  if (params.__clerk_ticket) {
    const qs = new URLSearchParams()
    qs.set('__clerk_ticket', params.__clerk_ticket)
    if (params.__clerk_status) {
      qs.set('__clerk_status', params.__clerk_status)
    }
    redirect(`/sign-up?${qs.toString()}`)
  }

  return <AuthContinueClient />
}
