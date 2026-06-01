import 'server-only'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'

export type AssistantCommissionerDivision = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current?: string }
}

export async function getAssistantCommissionerViewerEmail() {
  const user = await import('@clerk/nextjs/server').then(m => m.currentUser())
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

export async function getAssistantCommissionerDivision(): Promise<AssistantCommissionerDivision | null> {
  const email = await getAssistantCommissionerViewerEmail()
  if (!email) return null

  return client.fetch<AssistantCommissionerDivision | null>(
    /* groq */ `
      coalesce(
        *[_type == "division" && assistantCommissioner->status == "active" && lower(assistantCommissioner->email) == $email][0]{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "assistant_commissioner"][0].division->{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        }
      )
    `,
    { email },
  )
}

export async function canManageAssistantCommissionerDivision(
  divisionId: string,
): Promise<boolean> {
  const email = await getAssistantCommissionerViewerEmail()
  if (!email) return false

  const permanent = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "division"
          && _id == $divisionId
          && (
            lower(assistantCommissioner->email) == $email
            || assistantCommissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id
            || *[_type == "staff" && lower(email) == $email && status == "active" && role == "assistant_commissioner" && division._ref == $divisionId][0]._id != null
          )
        ][0]
      ) > 0
    `,
    { divisionId, email },
  )

  if (permanent) return true

  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return false

  const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
    actingRole: 'assistant_commissioner',
    divisionId,
  })

  return Boolean(acting)
}
