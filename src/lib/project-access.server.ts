import 'server-only'

import { parseProjectRole, type ProjectRole } from '@/lib/project-role'
import {
  canUseSuperadminPowers,
  getEffectiveViewerEmail,
} from '@/lib/impersonation/viewer-context.server'
import { client } from '@/sanity/lib/client'

export interface ProjectMembership {
  projectId: string
  projectName: string
  role: ProjectRole
  workstreamId: string | null
  workstreamName: string | null
}

export async function getProjectByIdForViewer(
  projectId: string,
): Promise<{ projectId: string; projectName: string } | null> {
  const project = await client.fetch<{ name?: string } | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0]{ name }`,
    { projectId },
  )
  if (!project) return null
  return {
    projectId,
    projectName: project.name?.trim() || 'Project',
  }
}

export async function canAccessProjectWorkspace(
  projectId: string,
): Promise<boolean> {
  if (await canUseSuperadminPowers()) {
    return Boolean(await getProjectByIdForViewer(projectId))
  }
  return Boolean(await getProjectMembershipForViewer(projectId))
}

export async function getProjectMembershipForViewer(
  projectId: string,
): Promise<ProjectMembership | null> {
  const email = await getEffectiveViewerEmail()
  if (!email) return null

  const row = await client.fetch<{
    role?: string
    projectName?: string
    workstreamId?: string | null
    workstreamName?: string | null
  } | null>(
    /* groq */ `
      coalesce(
        *[_type == "projectMember"
          && status == "active"
          && project._ref == $projectId
          && lower(staff->email) == $email
        ] | order(
          select(
            role == "project_manager" => 0,
            role == "deputy_project_manager" => 1,
            role == "workstream_lead" => 2,
            3
          ) asc
        )[0]{
          role,
          "projectName": project->name,
          "workstreamId": workstream._ref,
          "workstreamName": coalesce(
            workstream->name,
            *[_type == "section"
              && project._ref == $projectId
              && workstreamLead._ref == ^.staff._ref
            ][0].name
          )
        },
        *[_type == "project"
          && _id == $projectId
          && lower(projectManager->email) == $email
        ][0]{
          "role": "project_manager",
          "projectName": name,
          "workstreamId": null
        },
        *[_type == "project"
          && _id == $projectId
          && lower(deputyProjectManager->email) == $email
        ][0]{
          "role": "deputy_project_manager",
          "projectName": name,
          "workstreamId": null
        }
      )
    `,
    { projectId, email },
  )

  const role = parseProjectRole(row?.role)
  if (!role) return null

  return {
    projectId,
    projectName: row?.projectName?.trim() || 'Project',
    role,
    workstreamId: row?.workstreamId ?? null,
    workstreamName: row?.workstreamName?.trim() || null,
  }
}

export async function isSectionInProject(sectionId: string): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `defined(*[_type == "section" && _id == $sectionId && defined(project._ref)][0]._id)`,
    { sectionId },
  )
}

export async function getProjectIdForSection(
  sectionId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "section" && _id == $sectionId][0].project._ref`,
    { sectionId },
  )
}
