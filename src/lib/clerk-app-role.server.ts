import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'
import {
  appRoleFromPublicMetadata,
  appRoleFromSessionClaims,
  type AppRole,
} from '@/lib/app-role'

/**
 * Role from Clerk public metadata (`appRole`). Use in Server Components and Route Handlers.
 */
export async function getAppRole(): Promise<AppRole | null> {
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
  const { sessionClaims, userId } = await auth()
  if (!userId) return null
  return appRoleFromSessionClaims(sessionClaims)
}
