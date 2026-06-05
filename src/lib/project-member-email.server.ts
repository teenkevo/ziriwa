import 'server-only'

import { client } from '@/sanity/lib/client'
import {
  PROJECT_MEMBER_EMAIL_ACTIVE_ERROR,
  PROJECT_MEMBER_EMAIL_INACTIVE_ERROR,
  WORKSTREAM_MEMBER_EMAIL_ACTIVE_ERROR,
  WORKSTREAM_MEMBER_EMAIL_INACTIVE_ERROR,
} from '@/lib/project-member-email'

export async function getProjectMemberEmailConflict(
  projectId: string,
  options: { staffId?: string; email?: string },
): Promise<'active' | 'inactive' | null> {
  const email = options.email?.trim().toLowerCase() ?? ''
  const staffId = options.staffId?.trim() ?? ''

  if (!email && !staffId) return null

  const row = await client.fetch<{ status?: string } | null>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && (
          ($staffId != "" && staff._ref == $staffId)
          || ($email != "" && lower(staff->email) == $email)
        )
      ] | order(select(status == "active" => 0, 1) asc)[0]{
        status
      }
    `,
    { projectId, staffId, email },
  )

  if (!row?.status) return null
  return row.status === 'active' ? 'active' : 'inactive'
}

export function projectMemberEmailConflictError(
  conflict: 'active' | 'inactive',
): string {
  return conflict === 'active'
    ? PROJECT_MEMBER_EMAIL_ACTIVE_ERROR
    : PROJECT_MEMBER_EMAIL_INACTIVE_ERROR
}

export async function getWorkstreamMemberEmailConflict(
  projectId: string,
  workstreamId: string,
  email: string,
): Promise<'active' | 'inactive' | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const row = await client.fetch<{ status?: string } | null>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && workstream._ref == $workstreamId
        && role in ["workstream_lead", "workstream_member"]
        && lower(staff->email) == $email
      ] | order(select(status == "active" => 0, 1) asc)[0]{
        status
      }
    `,
    { projectId, workstreamId, email: normalized },
  )

  if (!row?.status) return null
  return row.status === 'active' ? 'active' : 'inactive'
}

export function workstreamMemberEmailConflictError(
  conflict: 'active' | 'inactive',
): string {
  return conflict === 'active'
    ? WORKSTREAM_MEMBER_EMAIL_ACTIVE_ERROR
    : WORKSTREAM_MEMBER_EMAIL_INACTIVE_ERROR
}
