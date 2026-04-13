import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * Sanity staff document id for the signed-in user when they belong to `sectionId`.
 */
export async function getViewerStaffIdForSection(
  sectionId: string,
): Promise<string | null> {
  const user = await currentUser()
  const emailRaw =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress
  const email = emailRaw?.trim().toLowerCase()
  if (!email) return null

  return writeClient.fetch<string | null>(
    `*[_type == "staff" && lower(email) == $email && section._ref == $sectionId][0]._id`,
    { email, sectionId },
  )
}
