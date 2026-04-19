import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * In local dev with `AUTH_GATED=false` we want the app to run without Clerk
 * middleware/session cookies (e.g. for curl-based testing).
 */
const AUTH_GATED = process.env.AUTH_GATED === 'true'

export async function getUserIdOrDev(): Promise<string | null> {
  if (!AUTH_GATED) return 'dev'
  const { userId } = await auth()
  return userId ?? null
}

export async function getCurrentUserEmailOrDev(): Promise<string | null> {
  if (!AUTH_GATED) return 'dev@example.local'
  const user = await currentUser()
  const emailRaw =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress
  return emailRaw?.trim().toLowerCase() ?? null
}

