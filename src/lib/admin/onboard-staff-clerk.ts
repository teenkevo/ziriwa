import { clerkClient } from '@clerk/nextjs/server'

import { isAppRole, parseAppRole, type AppRole } from '@/lib/app-role'
import { URA_EMAIL_SUFFIX } from '@/lib/staff-roles'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

const LOGIN_APP_ROLES = new Set<AppRole>([
  'commissioner_general',
  'commissioner',
  'assistant_commissioner',
  'manager',
  'supervisor',
  'officer',
])

function parseMemberName(
  name: string | undefined,
  email: string,
): { firstName: string; lastName: string } {
  const trimmed = name?.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return {
        firstName: parts[0]!,
        lastName: parts.slice(1).join(' '),
      }
    }
    return { firstName: parts[0] ?? 'Staff', lastName: 'Member' }
  }
  const local = email.split('@')[0] ?? 'staff'
  const fromEmail = local.replace(/[._-]+/g, ' ').trim()
  const emailParts = fromEmail.split(/\s+/).filter(Boolean)
  if (emailParts.length >= 2) {
    return {
      firstName: emailParts[0]!,
      lastName: emailParts.slice(1).join(' '),
    }
  }
  return { firstName: emailParts[0] ?? 'Staff', lastName: 'Member' }
}

function onboardingIdNumber(seed: string): string {
  const suffix = seed.replace(/\W/g, '').slice(-12).toUpperCase()
  return `ONB-${suffix || 'USER'}`
}

export function staffRoleToAppRole(role: string | undefined): AppRole | null {
  return parseAppRole(role)
}

export function shouldInviteAppRole(appRole: AppRole | null): appRole is AppRole {
  return appRole !== null && LOGIN_APP_ROLES.has(appRole)
}

async function findClerkUserByEmail(email: string) {
  const clerk = await clerkClient()
  const normalized = email.toLowerCase()
  const users = await clerk.users.getUserList({ limit: 200 })
  return (
    users.data.find(u =>
      u.emailAddresses.some(
        e => e.emailAddress?.toLowerCase() === normalized,
      ),
    ) ?? null
  )
}

async function findCommissionerGeneralUserId(
  excludeClerkUserId?: string,
): Promise<string | null> {
  const clerk = await clerkClient()
  const users = await clerk.users.getUserList({ limit: 200 })
  for (const user of users.data) {
    if (excludeClerkUserId && user.id === excludeClerkUserId) continue
    const role = parseAppRole(
      (user.publicMetadata as Record<string, unknown> | undefined)?.appRole,
    )
    if (role === 'commissioner_general') return user.id
  }
  return null
}

/** Create or return existing Sanity staff for admin onboarding (before Clerk signup). */
export async function ensureStaffRecord(params: {
  email: string
  memberName?: string
  firstName?: string
  lastName?: string
  idNumber?: string
  appRole?: AppRole | null
}): Promise<string> {
  const email = params.email.trim().toLowerCase()
  if (!email.endsWith(URA_EMAIL_SUFFIX)) {
    throw new Error(`Email must end with ${URA_EMAIL_SUFFIX}`)
  }

  const existing = await client.fetch<{ _id: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email][0]{ _id }`,
    { email },
  )
  if (existing?._id) return existing._id

  const parsed =
    params.firstName && params.lastName
      ? { firstName: params.firstName, lastName: params.lastName }
      : parseMemberName(params.memberName, email)

  const role =
    params.appRole && isAppRole(params.appRole) ? params.appRole : 'officer'

  const created = await writeClient.create({
    _type: 'staff',
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    fullName: `${parsed.firstName} ${parsed.lastName}`.trim(),
    idNumber: params.idNumber?.trim() || onboardingIdNumber(email),
    email,
    role,
    status: 'active' as const,
  })

  return created._id
}

/** Send Clerk invite or set app role on an existing Clerk user. */
export async function inviteOrAssignClerkAppRole(
  email: string,
  appRole: AppRole,
): Promise<{ invited: boolean; clerkUserId?: string }> {
  if (appRole === 'commissioner_general') {
    const existingCg = await findCommissionerGeneralUserId()
    if (existingCg) {
      throw new Error(
        'Commissioner General is already assigned to another user. Remove that role first.',
      )
    }
  }

  const emailLower = email.toLowerCase()
  const existing = await findClerkUserByEmail(emailLower)
  const clerk = await clerkClient()

  if (existing) {
    const meta = (existing.publicMetadata ?? {}) as Record<string, unknown>
    await clerk.users.updateUser(existing.id, {
      publicMetadata: { ...meta, appRole },
    })
    return { invited: false, clerkUserId: existing.id }
  }

  await clerk.invitations.createInvitation({
    emailAddress: emailLower,
    notify: true,
    ignoreExisting: true,
  })

  return { invited: true }
}

/** Sanity staff row + Clerk invite/role (admin onboarding). */
export async function onboardStaffMember(params: {
  email: string
  appRole: AppRole
  memberName?: string
  firstName?: string
  lastName?: string
  idNumber?: string
}): Promise<{ staffId: string; invited: boolean }> {
  const staffId = await ensureStaffRecord({
    email: params.email,
    memberName: params.memberName,
    firstName: params.firstName,
    lastName: params.lastName,
    idNumber: params.idNumber,
    appRole: params.appRole,
  })

  const { invited } = await inviteOrAssignClerkAppRole(params.email, params.appRole)
  return { staffId, invited }
}

export async function syncClerkAppRoleFromStaffEmail(
  clerkUserId: string,
  email: string,
): Promise<void> {
  const staff = await client.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email][0]{ role }`,
    { email: email.toLowerCase() },
  )
  const appRole = staffRoleToAppRole(staff?.role)
  if (!appRole) return

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(clerkUserId)
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>
  await clerk.users.updateUser(clerkUserId, {
    publicMetadata: { ...meta, appRole },
  })
}
