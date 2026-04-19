import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'
import {
  appRoleFromPublicMetadata,
  appRoleFromSessionClaims,
  type AppRole,
} from '@/lib/app-role'

const AUTH_GATED = process.env.AUTH_GATED === 'true'

/**
 * Role from Clerk public metadata (`appRole`). Use in Server Components and Route Handlers.
 */
export async function getAppRole(): Promise<AppRole | null> {
  if (!AUTH_GATED) {
    // In open local dev mode, assume highest role so workflows can be exercised.
    return 'commissioner'
  }
  const user = await currentUser()
  if (!user) return null
  return appRoleFromPublicMetadata(
    user.publicMetadata as Record<string, unknown>,
  )
}

/**
 * Role from the session JWT only (`app_role` claim). Use in `middleware.ts` after adding
 * the Clerk JWT template; returns null if the claim is missing.
 */
export async function getAppRoleFromSession(): Promise<AppRole | null> {
  if (!AUTH_GATED) {
    return 'commissioner'
  }
  const { sessionClaims, userId } = await auth()
  if (!userId) return null
  return appRoleFromSessionClaims(sessionClaims)
}
