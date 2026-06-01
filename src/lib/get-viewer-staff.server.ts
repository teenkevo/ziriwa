import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'

export async function getViewerStaffId(): Promise<string | null> {
  const user = await currentUser()
  const email = (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
  if (!email) return null

  return client.fetch<string | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]._id`,
    { email },
  )
}
