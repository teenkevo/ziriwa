import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'
import { cache } from 'react'

import {
  appRoleFromPublicMetadata,
  parseAppRole,
  type AppRole,
} from '@/lib/app-role'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { readImpersonationEmail } from '@/lib/impersonation/cookie.server'
import { client } from '@/sanity/lib/client'

export interface ViewerContext {
  clerkUserId: string | null
  realEmail: string
  realName: string
  isImpersonating: boolean
  effectiveEmail: string
  effectiveName: string
  effectiveStaffId: string | null
  effectiveAppRole: AppRole | null
  isSuperadmin: boolean
}

interface StaffRow {
  _id: string
  name?: string
  email?: string
  role?: string
}

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

function getDisplayName(
  user: Awaited<ReturnType<typeof currentUser>>,
  email: string,
): string {
  const fromClerk = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  return fromClerk || email
}

function isSuperadminEmail(email: string): boolean {
  if (!email) return false
  return getSuperadminEmailWhitelist().includes(email.toLowerCase())
}

async function getStaffByEmail(email: string): Promise<StaffRow | null> {
  if (!email) return null
  return client.fetch<StaffRow | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
      _id,
      name,
      email,
      role
    }`,
    { email },
  )
}

async function resolveAppRoleForEmail(
  email: string,
  user: Awaited<ReturnType<typeof currentUser>>,
): Promise<AppRole | null> {
  const clerkRole = appRoleFromPublicMetadata(
    user?.publicMetadata as Record<string, unknown> | undefined,
  )
  if (clerkRole && getPrimaryEmail(user) === email) return clerkRole

  const staff = await getStaffByEmail(email)
  return parseAppRole(staff?.role)
}

export const getViewerContext = cache(async function getViewerContext(): Promise<ViewerContext> {
  const user = await currentUser()
  const { userId } = await auth()
  const realEmail = getPrimaryEmail(user)
  const realName = getDisplayName(user, realEmail)
  const isSuperadmin = isSuperadminEmail(realEmail)
  const impersonatedEmail = await readImpersonationEmail()

  if (!impersonatedEmail || !isSuperadmin) {
    const staff = await getStaffByEmail(realEmail)
    const effectiveAppRole = await resolveAppRoleForEmail(realEmail, user)
    return {
      clerkUserId: userId ?? null,
      realEmail,
      realName,
      isImpersonating: false,
      effectiveEmail: realEmail,
      effectiveName: staff?.name?.trim() || realName,
      effectiveStaffId: staff?._id ?? null,
      effectiveAppRole,
      isSuperadmin,
    }
  }

  if (impersonatedEmail === realEmail || isSuperadminEmail(impersonatedEmail)) {
    return {
      clerkUserId: userId ?? null,
      realEmail,
      realName,
      isImpersonating: false,
      effectiveEmail: realEmail,
      effectiveName: realName,
      effectiveStaffId: (await getStaffByEmail(realEmail))?._id ?? null,
      effectiveAppRole: await resolveAppRoleForEmail(realEmail, user),
      isSuperadmin,
    }
  }

  const targetStaff = await getStaffByEmail(impersonatedEmail)
  if (!targetStaff) {
    return {
      clerkUserId: userId ?? null,
      realEmail,
      realName,
      isImpersonating: false,
      effectiveEmail: realEmail,
      effectiveName: realName,
      effectiveStaffId: (await getStaffByEmail(realEmail))?._id ?? null,
      effectiveAppRole: await resolveAppRoleForEmail(realEmail, user),
      isSuperadmin,
    }
  }

  return {
    clerkUserId: userId ?? null,
    realEmail,
    realName,
    isImpersonating: true,
    effectiveEmail: impersonatedEmail,
    effectiveName: targetStaff.name?.trim() || impersonatedEmail,
    effectiveStaffId: targetStaff._id,
    effectiveAppRole: parseAppRole(targetStaff.role),
    isSuperadmin,
  }
})

export async function getEffectiveViewerEmail(): Promise<string> {
  const ctx = await getViewerContext()
  return ctx.effectiveEmail
}

export async function canUseSuperadminPowers(): Promise<boolean> {
  const ctx = await getViewerContext()
  return ctx.isSuperadmin && !ctx.isImpersonating
}
