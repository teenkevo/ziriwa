import 'server-only'

import { NextResponse } from 'next/server'

import { client } from '@/sanity/lib/client'

export async function getProjectIdForSection(
  sectionId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "section" && _id == $sectionId][0].project._ref`,
    { sectionId },
  )
}

export async function isProjectManagerForProject(
  projectId: string,
  staffId: string,
): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "project"
          && _id == $projectId
          && projectManager._ref == $staffId
        ][0]
      ) > 0
    `,
    { projectId, staffId },
  )
}

export async function isDeputyProjectManagerOnProject(
  projectId: string,
  staffId: string,
): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "projectMember"
          && project._ref == $projectId
          && status == "active"
          && role == "deputy_project_manager"
          && staff._ref == $staffId
        ][0]
      ) > 0
    `,
    { projectId, staffId },
  )
}

export function projectDelegationDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}
