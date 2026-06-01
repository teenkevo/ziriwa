import 'server-only'

import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import {
  computeSprintNavCounts,
  emptySprintNavCounts,
  type SprintNavCounts,
} from '@/lib/sprint-nav-counts'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export async function getSprintNavCountsForViewer(): Promise<SprintNavCounts> {
  const sections = await getManagedSectionsForViewer()
  const sectionId = sections[0]?._id
  if (!sectionId) return emptySprintNavCounts()

  const [sprints, access] = await Promise.all([
    getSprintsBySection(sectionId),
    getSectionAccessForViewer(sectionId, 'own'),
  ])

  return computeSprintNavCounts(sprints, access)
}
