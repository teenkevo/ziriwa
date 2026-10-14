import 'server-only'

import { cache } from 'react'
import { getEffectiveViewerEmail } from '@/lib/impersonation/viewer-context.server'
import { client } from '@/sanity/lib/client'

const COMMISSIONER_DEPARTMENT_ID_QUERY = /* groq */ `
  coalesce(
    *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
    *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
    *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
  )
`

/** Department the current viewer leads as commissioner. Deduped per request. */
export const getCommissionerDepartmentIdForViewer = cache(
  async function getCommissionerDepartmentIdForViewer(): Promise<string | null> {
    const email = await getEffectiveViewerEmail()
    if (!email) return null
    return client.fetch<string | null>(COMMISSIONER_DEPARTMENT_ID_QUERY, {
      email,
    })
  },
)
