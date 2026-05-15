import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { NotAuthorized } from '@/components/admin/not-authorized'
import { UserManagementPage } from '@/features/admin/user-management-page'
import { parseAppRole } from '@/lib/app-role'
import { isUserAdmin } from '@/lib/authz/guards.server'
import { staffByEmailsQuery } from '@/lib/admin/queries'
import type { AppMemberRow, PendingInviteRow } from '@/components/admin/members-table'
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic'

type StaffByEmail = {
  _id: string
  email: string
  departmentName?: string
}

export default async function AdminUsersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const canManage = await isUserAdmin()
  if (!canManage) {
    return (
      <NotAuthorized
        title='Not authorized'
        description="You don't have access to user onboarding."
        hint='Ask a system administrator to add your email to SUPERADMIN_EMAILS or assign you a commissioner role with staff management permissions.'
      />
    )
  }

  const clerk = await clerkClient()
  const [usersResult, invitationsResult] = await Promise.all([
    clerk.users.getUserList({ limit: 200 }),
    clerk.invitations.getInvitationList({ status: 'pending', limit: 100 }),
  ])

  const membersBase = usersResult.data.flatMap(u => {
    const email = u.emailAddresses.find(
      e => e.id === u.primaryEmailAddressId,
    )?.emailAddress
    if (!email) return []
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined
    const meta = u.publicMetadata as Record<string, unknown> | undefined
    const appRole = parseAppRole(meta?.appRole)
    return [
      {
        clerkUserId: u.id,
        email: email.toLowerCase(),
        name,
        imageUrl: u.imageUrl,
        appRole,
        staff: null as AppMemberRow['staff'],
      },
    ]
  })

  const emails = membersBase.map(m => m.email)
  const staffRows =
    emails.length > 0
      ? await client.fetch<StaffByEmail[]>(staffByEmailsQuery, { emails })
      : []

  const staffByEmail = new Map(staffRows.map(s => [s.email, s]))

  const members: AppMemberRow[] = membersBase.map(m => ({
    ...m,
    staff: staffByEmail.get(m.email) ?? null,
  }))

  const pendingInvites: PendingInviteRow[] = invitationsResult.data.map(
    inv => ({
      id: inv.id,
      email: inv.emailAddress.toLowerCase(),
      createdAt: inv.createdAt,
    }),
  )

  return (
    <UserManagementPage members={members} pendingInvites={pendingInvites} />
  )
}
