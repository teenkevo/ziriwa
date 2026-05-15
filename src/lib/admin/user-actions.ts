'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { isAppRole, type AppRole } from '@/lib/app-role'
import { requireUserAdmin } from '@/lib/authz/guards.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

function getString(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

async function syncStaffRoleForEmail(email: string, appRole: AppRole) {
  const staff = await client.fetch<{ _id: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email][0]{ _id }`,
    { email: email.toLowerCase() },
  )
  if (!staff?._id) return
  await writeClient.patch(staff._id).set({ role: appRole }).commit()
}

export async function assignAppRoleAction(formData: FormData) {
  await requireUserAdmin()

  const clerkUserId = getString(formData, 'clerkUserId')
  const appRoleRaw = getString(formData, 'appRole')

  if (!clerkUserId) throw new Error('Missing user')

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(clerkUserId)
  const email = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId,
  )?.emailAddress

  const existingMeta = (user.publicMetadata ?? {}) as Record<string, unknown>

  if (!appRoleRaw) {
    const { appRole: _removed, ...rest } = existingMeta
    await clerk.users.updateUser(clerkUserId, { publicMetadata: rest })
    revalidatePath('/admin/users')
    return
  }

  if (!isAppRole(appRoleRaw)) throw new Error('Invalid application role')

  await clerk.users.updateUser(clerkUserId, {
    publicMetadata: {
      ...existingMeta,
      appRole: appRoleRaw,
    },
  })

  if (email) await syncStaffRoleForEmail(email, appRoleRaw)

  revalidatePath('/admin/users')
}

export async function revokeInvitationAction(formData: FormData) {
  await requireUserAdmin()

  const invitationId = getString(formData, 'invitationId')
  if (!invitationId) throw new Error('Missing invitation')

  const clerk = await clerkClient()
  await clerk.invitations.revokeInvitation(invitationId)

  revalidatePath('/admin/users')
}
