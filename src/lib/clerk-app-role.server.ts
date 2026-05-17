import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'
import {
  appRoleFromPublicMetadata,
  appRoleFromSessionClaims,
  parseAppRole,
  type AppRole,
} from '@/lib/app-role'
import { client } from '@/sanity/lib/client'

function getPrimaryEmail(
  user: Awaited<ReturnType<typeof currentUser>>,
): string {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

async function getStaffAppRoleByEmail(email: string): Promise<AppRole | null> {
  if (!email) return null

  const staff = await client.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{ role }`,
    { email },
  )

  return parseAppRole(staff?.role)
}

/**
 * Role from Clerk public metadata (`appRole`), with a Sanity staff-role
 * fallback for newly signed-in users whose Clerk metadata has not been set yet.
 * Use in Server Components and Route Handlers.
 */
export async function getAppRole(): Promise<AppRole | null> {
  const user = await currentUser()
  if (!user) return null

  const clerkRole = appRoleFromPublicMetadata(
    user.publicMetadata as Record<string, unknown>,
  )
  if (clerkRole) return clerkRole

  return getStaffAppRoleByEmail(getPrimaryEmail(user))
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
