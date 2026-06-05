import 'server-only'

import { client } from '@/sanity/lib/client'

export interface ProjectRecord {
  _id: string
  name: string
  slug?: { current?: string }
  status?: string
  projectManager?: { _id: string; email?: string; fullName?: string }
  deputyProjectManager?: { _id: string; email?: string; fullName?: string }
}

export async function getProjectById(
  projectId: string,
): Promise<ProjectRecord | null> {
  return client.fetch<ProjectRecord | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0]{
      _id,
      name,
      slug,
      status,
      projectManager->{ _id, email, "fullName": coalesce(fullName, firstName + " " + lastName) },
      deputyProjectManager->{ _id, email, "fullName": coalesce(fullName, firstName + " " + lastName) }
    }`,
    { projectId },
  )
}

export async function getProjectSlugById(
  projectId: string,
): Promise<string | null> {
  const slug = await client.fetch<string | null>(
    /* groq */ `*[_type == "project" && _id == $projectId][0].slug.current`,
    { projectId },
  )
  return slug?.trim() || null
}

export async function getProjectBySlug(
  slug: string,
): Promise<ProjectRecord | null> {
  return client.fetch<ProjectRecord | null>(
    /* groq */ `*[_type == "project" && slug.current == $slug][0]{
      _id,
      name,
      slug,
      status,
      projectManager->{ _id, email, "fullName": coalesce(fullName, firstName + " " + lastName) },
      deputyProjectManager->{ _id, email, "fullName": coalesce(fullName, firstName + " " + lastName) }
    }`,
    { slug },
  )
}
