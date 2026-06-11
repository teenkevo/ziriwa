import 'server-only'

import { client } from '@/sanity/lib/client'
import {
  canUseSuperadminPowers,
  getEffectiveViewerEmail,
} from '@/lib/impersonation/viewer-context.server'

import type { ProjectRole } from '@/lib/project-role'

export interface ViewerProjectOption {
  _id: string
  name: string
  slug?: { current?: string }
  role: ProjectRole
  memberCount: number
}

/** Active projects the signed-in user belongs to (or all active projects for superadmin). */
export async function getProjectsForViewer(): Promise<ViewerProjectOption[]> {
  if (await canUseSuperadminPowers()) {
    return client.fetch<ViewerProjectOption[]>(
      /* groq */ `
        *[_type == "project" && coalesce(status, "active") == "active"] | order(name asc) {
          _id,
          name,
          slug,
          "role": "project_manager",
          "memberCount": count(*[_type == "projectMember" && status == "active" && project._ref == ^._id])
        }
      `,
    )
  }

  const email = await getEffectiveViewerEmail()
  if (!email) return []

  const rows = (await client.fetch<ViewerProjectOption[]>(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && lower(staff->email) == $email
        && project->status != "archived"
      ] | order(project->name asc) {
        "role": role,
        "name": project->name,
        "slug": project->slug,
        "_id": project._ref,
        "memberCount": count(*[_type == "projectMember" && status == "active" && project._ref == ^.project._ref])
      }
    `,
    { email },
  )) ?? []

  const byProjectId = new Map<string, ViewerProjectOption>()
  const roleRank: Record<string, number> = {
    project_manager: 0,
    deputy_project_manager: 1,
    workstream_lead: 2,
    workstream_member: 3,
  }

  for (const row of rows) {
    const existing = byProjectId.get(row._id)
    if (!existing) {
      byProjectId.set(row._id, row)
      continue
    }
    const existingRank = roleRank[existing.role] ?? 99
    const nextRank = roleRank[row.role] ?? 99
    if (nextRank < existingRank) {
      byProjectId.set(row._id, row)
    }
  }

  return [...byProjectId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}
