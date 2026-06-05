import 'server-only'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { cache } from 'react'

import type { AppRole } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { hasPermission } from '@/lib/authz/permissions'
import type { CrudAction, ResourceKey } from '@/lib/authz/types'

export class AuthzError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 403,
  ) {
    super(message)
    this.name = 'AuthzError'
  }
}

export async function requireAuth(): Promise<{ userId: string }> {
  const { userId } = await auth()
  if (!userId) throw new AuthzError('Unauthorized', 401)
  return { userId }
}

export async function requireAppRole(): Promise<AppRole> {
  await requireAuth()
  const role = await getEffectiveAppRole()
  if (!role) {
    throw new AuthzError(
      'No application role assigned. Set appRole in Clerk public metadata.',
      403,
    )
  }
  return role
}

/** Superadmins are treated as commissioner_general for RBAC checks. */
export async function getEffectiveAppRole(): Promise<AppRole | null> {
  if (await isSuperadmin()) return 'commissioner_general'
  return getAppRole()
}

export async function requirePermission(
  resource: ResourceKey,
  action: CrudAction,
): Promise<AppRole> {
  await requireAuth()
  const role = await getEffectiveAppRole()
  if (!role || !hasPermission(role, resource, action)) {
    throw new AuthzError('Insufficient permissions', 403)
  }
  return role
}

/**
 * Route-handler helper: returns a JSON error response, or `null` when allowed.
 */
export async function assertPermission(
  resource: ResourceKey,
  action: CrudAction,
  message = 'Insufficient permissions',
): Promise<NextResponse | null> {
  try {
    await requirePermission(resource, action)
    return null
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: message }, { status: error.status })
    }
    throw error
  }
}

export async function assertAuth(): Promise<NextResponse | { userId: string }> {
  try {
    return await requireAuth()
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

/** Email allowlist (`SUPERADMIN_EMAILS` / `BOOTSTRAP_ADMIN_EMAIL`). */
export const isSuperadmin = cache(async function isSuperadmin(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false

  const allowlist = getSuperadminEmailWhitelist()
  if (allowlist.length === 0) return false

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId,
  )?.emailAddress
  if (!primaryEmail) return false
  return allowlist.includes(primaryEmail.toLowerCase())
})

/** Superadmin or commissioner-level staff management. */
export async function isUserAdmin(): Promise<boolean> {
  if (await isSuperadmin()) return true
  const role = await getAppRole()
  return hasPermission(role, 'staff', 'create')
}

/** Bootstrap / superadmin allowlist — create projects and org onboarding. */
export async function canCreateProject(): Promise<boolean> {
  return isSuperadmin()
}

export async function requireUserAdmin(): Promise<void> {
  if (!(await isUserAdmin())) {
    throw new AuthzError('Insufficient permissions', 403)
  }
}
