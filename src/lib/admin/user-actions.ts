'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { isAppRole, parseAppRole, type AppRole } from '@/lib/app-role'
import { ensureStaffRecord } from '@/lib/admin/onboard-staff-clerk'
import { requireUserAdmin } from '@/lib/authz/guards.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

function staffRef(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

async function findCommissionerGeneralUserId(
  excludeClerkUserId: string,
): Promise<string | null> {
  const clerk = await clerkClient()
  const users = await clerk.users.getUserList({ limit: 200 })
  for (const user of users.data) {
    if (user.id === excludeClerkUserId) continue
    const role = parseAppRole(
      (user.publicMetadata as Record<string, unknown> | undefined)?.appRole,
    )
    if (role === 'commissioner_general') return user.id
  }
  return null
}

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

  if (appRoleRaw === 'commissioner_general') {
    const existingCg = await findCommissionerGeneralUserId(clerkUserId)
    if (existingCg) {
      throw new Error(
        'Commissioner General is already assigned to another user. Remove that role first.',
      )
    }
  }

  await clerk.users.updateUser(clerkUserId, {
    publicMetadata: {
      ...existingMeta,
      appRole: appRoleRaw,
    },
  })

  if (email) {
    await syncStaffRoleForEmail(email, appRoleRaw)
    if (appRoleRaw === 'commissioner_general') {
      const staff = await client.fetch<{ _id: string } | null>(
        /* groq */ `*[_type == "staff" && lower(email) == $email][0]{ _id }`,
        { email: email.toLowerCase() },
      )
      if (staff?._id) {
        const headed = await client.fetch<{ _id: string } | null>(
          /* groq */ `*[_type == "department" && commissioner._ref == $staffId][0]{ _id }`,
          { staffId: staff._id },
        )
        if (headed?._id) {
          await writeClient.patch(headed._id).unset(['commissioner']).commit()
        }
        await writeClient.patch(staff._id).unset(['department']).commit()
      }
    }
  }

  revalidatePath('/admin/users')
  revalidatePath('/departments')
}

export async function assignStaffDepartmentAction(formData: FormData) {
  await requireUserAdmin()

  let staffId = getString(formData, 'staffId')
  const clerkUserId = getString(formData, 'clerkUserId')
  const email = getString(formData, 'email').toLowerCase()
  const memberName = getString(formData, 'memberName')
  const departmentId = getString(formData, 'departmentId')
  const appRoleRaw = getString(formData, 'appRole')

  if (!staffId) {
    if (!clerkUserId || !email) {
      throw new Error('Missing user information for staff creation')
    }
    staffId = await ensureStaffRecord({
      email,
      memberName: memberName || undefined,
      appRole: appRoleRaw && isAppRole(appRoleRaw) ? appRoleRaw : null,
    })
  }

  if (appRoleRaw === 'commissioner_general') {
    throw new Error('Commissioner General is not assigned to a department')
  }

  const staff = await client.fetch<{
    _id: string
    role?: string
    department?: { _ref: string }
  } | null>(
    /* groq */ `*[_type == "staff" && _id == $staffId][0]{
      _id,
      role,
      department
    }`,
    { staffId },
  )
  if (!staff?._id) throw new Error('Staff record not found')

  const role = appRoleRaw || staff.role
  const isCommissioner = role === 'commissioner'

  if (!departmentId) {
    if (isCommissioner) {
      const headed = await client.fetch<{ _id: string } | null>(
        /* groq */ `*[_type == "department" && commissioner._ref == $staffId][0]{ _id }`,
        { staffId },
      )
      if (headed?._id) {
        await writeClient.patch(headed._id).unset(['commissioner']).commit()
      }
    }
    await writeClient.patch(staffId).unset(['department']).commit()
    revalidatePath('/admin/users')
    revalidatePath('/departments')
    return
  }

  const department = await client.fetch<{
    _id: string
    commissioner?: { _id: string }
  } | null>(
    /* groq */ `*[_type == "department" && _id == $departmentId][0]{
      _id,
      commissioner->{ _id }
    }`,
    { departmentId },
  )
  if (!department?._id) throw new Error('Department not found')

  if (isCommissioner) {
    const oldCommId = department.commissioner?._id
    if (oldCommId && oldCommId !== staffId) {
      await writeClient.patch(oldCommId).unset(['department']).commit()
    }

    const previousDept = await client.fetch<{ _id: string } | null>(
      /* groq */ `*[_type == "department" && commissioner._ref == $staffId && _id != $departmentId][0]{ _id }`,
      { staffId, departmentId },
    )
    if (previousDept?._id) {
      await writeClient.patch(previousDept._id).unset(['commissioner']).commit()
    }

    await writeClient
      .patch(staffId)
      .set({ department: staffRef(departmentId) })
      .commit()

    await writeClient
      .patch(departmentId)
      .set({ commissioner: staffRef(staffId) })
      .commit()
  } else {
    await writeClient
      .patch(staffId)
      .set({ department: staffRef(departmentId) })
      .commit()
  }

  revalidatePath('/admin/users')
  revalidatePath('/departments')
}

export async function revokeInvitationAction(formData: FormData) {
  await requireUserAdmin()

  const invitationId = getString(formData, 'invitationId')
  if (!invitationId) throw new Error('Missing invitation')

  const clerk = await clerkClient()
  await clerk.invitations.revokeInvitation(invitationId)

  revalidatePath('/admin/users')
}
