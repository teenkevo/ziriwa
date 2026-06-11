import 'server-only'

import { getEffectiveViewerEmail } from '@/lib/impersonation/viewer-context.server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * Sanity staff document id for the signed-in user when they belong to `sectionId`
 * (mainstream section assignment or project workstream membership).
 */
export async function getViewerStaffIdForSection(
  sectionId: string,
): Promise<string | null> {
  const email = await getEffectiveViewerEmail()
  if (!email) return null

  const bySection = await writeClient.fetch<string | null>(
    /* groq */ `
      *[_type == "staff"
        && lower(email) == $email
        && section._ref == $sectionId
        && !defined(*[_type == "section" && _id == $sectionId][0].project._ref)
      ][0]._id
    `,
    { email, sectionId },
  )
  if (bySection) return bySection

  const byWorkstreamMember = await writeClient.fetch<string | null>(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && workstream._ref == $sectionId
        && lower(staff->email) == $email
      ][0].staff._ref
    `,
    { email, sectionId },
  )
  if (byWorkstreamMember) return byWorkstreamMember

  const byProjectManager = await writeClient.fetch<string | null>(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && role == "project_manager"
        && lower(staff->email) == $email
        && project._ref == *[_type == "section" && _id == $sectionId][0].project._ref
      ][0].staff._ref
    `,
    { email, sectionId },
  )
  if (byProjectManager) return byProjectManager

  return writeClient.fetch<string | null>(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && role == "deputy_project_manager"
        && lower(staff->email) == $email
        && project._ref == *[_type == "section" && _id == $sectionId][0].project._ref
      ][0].staff._ref
    `,
    { email, sectionId },
  )
}
