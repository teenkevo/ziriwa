import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type { WeeklySprint } from './get-sprints-by-section'

export async function getSprintsByWorkstreamIds(
  sectionIds: string[],
): Promise<WeeklySprint[]> {
  if (sectionIds.length === 0) return []

  const query = defineQuery(`
    *[_type == "weeklySprint" && section._ref in $sectionIds] | order(weekStart desc) {
      _id,
      weekLabel,
      weekStart,
      weekEnd,
      status,
      supervisor->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      "sectionId": section._ref,
      tasks[] {
        _key, description, activityCategory,
        initiativeKey, initiativeTitle, activityKey, activityTitle,
        contractTaskKey, contractTaskTitle,
        status, revisionReason, reviewedAt,
        "assignee": assignee._ref,
        "assigneeName": assignee->fullName,
        priority, taskStatus,
        workSubmissions[] {
          _key, date, startTime, endTime, totalHours, description,
          output { asset->{ _id, url, originalFilename, size, mimeType } },
          revenueAssessed, status, submittedAt,
          reviewThread[] { _key, role, action, message, createdAt }
        }
      },
    }
  `)

  try {
    const sprints = await sanityFetch({
      query,
      params: { sectionIds },
      revalidate: 0,
    })
    return (sprints as WeeklySprint[]) || []
  } catch (error) {
    console.error('Error fetching sprints by workstreams', error)
    return []
  }
}
