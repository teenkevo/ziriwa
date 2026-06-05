import 'server-only'

import { ensureClerkAccessForStaffEmail } from '@/lib/admin/onboard-staff-clerk'
import { client } from '@/sanity/lib/client'

export async function getStaffEmailById(staffId: string): Promise<string | null> {
  const email = await client.fetch<string | null>(
    /* groq */ `*[_type == "staff" && _id == $staffId][0].email`,
    { staffId },
  )
  return email?.trim().toLowerCase() || null
}

/** Clerk invite + appRole sync for a Sanity staff row tied to a project member. */
export async function provisionClerkForProjectStaff(
  staffId: string,
  emailHint = '',
): Promise<{
  invited: boolean
  resent?: boolean
  clerkUserId?: string
  existingClerkUser?: boolean
}> {
  const email =
    emailHint.trim().toLowerCase() || (await getStaffEmailById(staffId)) || ''

  if (!email) {
    throw new Error('Staff email is required for Clerk access')
  }

  return ensureClerkAccessForStaffEmail(email, { defaultAppRole: 'officer' })
}
