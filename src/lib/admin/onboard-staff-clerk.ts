import { clerkClient } from '@clerk/nextjs/server'

import { isAppRole, parseAppRole, type AppRole } from '@/lib/app-role'
import { getInvitationAcceptUrl } from '@/lib/app-url.server'
import {
  isAllowedStaffEmail,
  staffEmailRequirementMessage,
} from '@/lib/staff-email-policy'
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

async function findPendingClerkInvitationByEmail(email: string) {
  const clerk = await clerkClient()
  const normalized = email.toLowerCase()
  const invitations = await clerk.invitations.getInvitationList({
    status: 'pending',
    query: normalized,
    limit: 10,
  })
  return (
    invitations.data.find(
      inv => inv.emailAddress.toLowerCase() === normalized,
    ) ?? null
  )
}

async function revokePendingClerkInvitation(email: string) {
  const pending = await findPendingClerkInvitationByEmail(email)
  if (!pending) return false
  const clerk = await clerkClient()
  await clerk.invitations.revokeInvitation(pending.id)
  return true
}

async function sendClerkInvitation(
  emailLower: string,
  appRole: AppRole,
): Promise<{ invited: boolean; resent: boolean }> {
  const clerk = await clerkClient()
  const hadPending = await revokePendingClerkInvitation(emailLower)

  await clerk.invitations.createInvitation({
    emailAddress: emailLower,
    notify: true,
    publicMetadata: { appRole },
    redirectUrl: getInvitationAcceptUrl(),
  })

  return { invited: true, resent: hadPending }
}

async function findClerkUserByEmail(email: string) {
  const clerk = await clerkClient()
  const normalized = email.toLowerCase()

  const byEmail = await clerk.users.getUserList({
    emailAddress: [normalized],
    limit: 1,
  })
  if (byEmail.data[0]) return byEmail.data[0]

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
  if (!isAllowedStaffEmail(email)) {
    throw new Error(staffEmailRequirementMessage())
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

/**
 * Ensure a Sanity staff member can sign in via Clerk.
 * Sends an invitation for new users; syncs appRole from Sanity for existing users.
 */
export async function ensureClerkAccessForStaffEmail(
  email: string,
  options?: { defaultAppRole?: AppRole },
): Promise<{
  invited: boolean
  resent?: boolean
  clerkUserId?: string
  existingClerkUser?: boolean
}> {
  const emailLower = email.trim().toLowerCase()
  if (!emailLower) {
    throw new Error('Email is required for Clerk access')
  }

  const staff = await writeClient.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email][0]{ role }`,
    { email: emailLower },
  )
  const appRole =
    staffRoleToAppRole(staff?.role) ?? options?.defaultAppRole ?? null
  if (!appRole || !shouldInviteAppRole(appRole)) {
    throw new Error(
      staff?.role
        ? `Staff role "${staff.role}" cannot sign in to the app`
        : 'Staff record is missing a sign-in role',
    )
  }

  const existing = await findClerkUserByEmail(emailLower)
  if (existing) {
    await syncClerkAppRoleFromStaffEmail(existing.id, emailLower)
    return {
      invited: false,
      clerkUserId: existing.id,
      existingClerkUser: true,
    }
  }

  const sent = await sendClerkInvitation(emailLower, appRole)
  return { invited: sent.invited, resent: sent.resent }
}

/** @deprecated Use ensureClerkAccessForStaffEmail */
export async function inviteClerkUserIfNeeded(
  email: string,
): Promise<{ invited: boolean; clerkUserId?: string }> {
  return ensureClerkAccessForStaffEmail(email)
}

/** Send Clerk invite or set app role on an existing Clerk user. */
export async function inviteOrAssignClerkAppRole(
  email: string,
  appRole: AppRole,
): Promise<{
  invited: boolean
  resent?: boolean
  clerkUserId?: string
  existingClerkUser?: boolean
}> {
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

  if (existing) {
    const clerk = await clerkClient()
    const meta = (existing.publicMetadata ?? {}) as Record<string, unknown>
    await clerk.users.updateUser(existing.id, {
      publicMetadata: { ...meta, appRole },
    })
    return {
      invited: false,
      clerkUserId: existing.id,
      existingClerkUser: true,
    }
  }

  const sent = await sendClerkInvitation(emailLower, appRole)
  return { invited: sent.invited, resent: sent.resent }
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
