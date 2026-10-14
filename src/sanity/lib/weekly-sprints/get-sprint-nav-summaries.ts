import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type SprintNavSummaryTask = {
  status?: string | null
  assignee?: string | null
}

export type SprintNavSummary = {
  weekStart: string
  status: 'draft' | 'submitted' | 'reviewed'
  supervisor?: { _id: string } | null
  tasks?: SprintNavSummaryTask[]
}

export async function getSprintNavSummariesBySection(
  sectionId: string,
): Promise<SprintNavSummary[]> {
  const query = defineQuery(`
    *[_type == "weeklySprint" && section._ref == $sectionId] | order(weekStart desc) {
      weekStart,
      status,
      supervisor->{ _id },
      tasks[] {
        status,
        "assignee": assignee._ref
      }
    }
  `)

  try {
    const sprints = await sanityFetch({
      query,
      params: { sectionId },
      revalidate: 0,
    })
    return (sprints as SprintNavSummary[]) || []
  } catch (error) {
    console.error('Error fetching sprint nav summaries by section', error)
    return []
  }
}

export async function getSprintNavSummariesByWorkstreamIds(
  sectionIds: string[],
): Promise<SprintNavSummary[]> {
  if (sectionIds.length === 0) return []

  const query = defineQuery(`
    *[_type == "weeklySprint" && section._ref in $sectionIds] | order(weekStart desc) {
      weekStart,
      status,
      supervisor->{ _id },
      tasks[] {
        status,
        "assignee": assignee._ref
      }
    }
  `)

  try {
    const sprints = await sanityFetch({
      query,
      params: { sectionIds },
      revalidate: 0,
    })
    return (sprints as SprintNavSummary[]) || []
  } catch (error) {
    console.error('Error fetching sprint nav summaries by workstreams', error)
    return []
  }
}
