import 'server-only'

import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { getProjectWorkstreamsForViewer } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import {
  computeSprintNavCounts,
  emptySprintNavCounts,
  type SprintNavCounts,
} from '@/lib/sprint-nav-counts'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export async function getSprintNavCountsForViewer(): Promise<SprintNavCounts> {
  const { isProjects, projectId } = await getProjectWorkspaceContext()

  if (isProjects && projectId) {
    const workstreams = await getProjectWorkstreamsForViewer(projectId)
    const sectionIds = workstreams.map(w => w._id)
    if (sectionIds.length === 0) return emptySprintNavCounts()

    const { getSprintsByWorkstreamIds } = await import(
      '@/sanity/lib/weekly-sprints/get-sprints-by-workstreams'
    )
    const sprints = await getSprintsByWorkstreamIds(sectionIds)
    const access = await getSectionAccessForViewer(sectionIds[0], 'own')
    return computeSprintNavCounts(sprints, access)
  }

  const sections = await getManagedSectionsForViewer()
  const sectionId = sections[0]?._id
  if (!sectionId) return emptySprintNavCounts()

  const [sprints, access] = await Promise.all([
    getSprintsBySection(sectionId),
    getSectionAccessForViewer(sectionId, 'own'),
  ])

  return computeSprintNavCounts(sprints, access)
}
