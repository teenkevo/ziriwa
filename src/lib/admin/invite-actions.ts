'use server'

import { revalidatePath } from 'next/cache'

import { onboardStaffMember } from '@/lib/admin/onboard-staff-clerk'
import { requireUserAdmin } from '@/lib/authz/guards.server'
import { URA_EMAIL_SUFFIX } from '@/lib/staff-roles'

function getString(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function inviteMemberAction(formData: FormData) {
  await requireUserAdmin()

  const emailAddress = getString(formData, 'emailAddress').toLowerCase()
  if (!emailAddress) throw new Error('Email is required')
  if (!emailAddress.endsWith(URA_EMAIL_SUFFIX)) {
    throw new Error(`Email must end with ${URA_EMAIL_SUFFIX}`)
  }

  await onboardStaffMember({
    email: emailAddress,
    appRole: 'officer',
  })

  revalidatePath('/admin/users')
}
