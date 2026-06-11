import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { cache } from 'react'
import {
  appRoleFromSessionClaims,
  type AppRole,
} from '@/lib/app-role'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'

/**
 * Effective application role for the current viewer (respects impersonation).
 * Use in Server Components and Route Handlers.
 */
export const getAppRole = cache(async function getAppRole(): Promise<AppRole | null> {
  const ctx = await getViewerContext()
  return ctx.effectiveAppRole
})

/**
 * Role from the session JWT only (`app_role` claim). Use in `middleware.ts` after adding
 * the Clerk JWT template; returns null if the claim is missing.
 */
export async function getAppRoleFromSession(): Promise<AppRole | null> {
  const { sessionClaims, userId } = await auth()
  if (!userId) return null
  return appRoleFromSessionClaims(sessionClaims)
}
