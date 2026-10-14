import 'server-only'

import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { isDateInFinancialYear } from '@/lib/financial-year'
import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getProjectWorkstreamsForViewer } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import {
  computeSprintNavCounts,
  emptySprintNavCounts,
  type SprintNavCounts,
} from '@/lib/sprint-nav-counts'
import {
  getSprintNavSummariesBySection,
  getSprintNavSummariesByWorkstreamIds,
  type SprintNavSummary,
} from '@/sanity/lib/weekly-sprints/get-sprint-nav-summaries'

function filterSprintsForActiveFy(
  sprints: SprintNavSummary[],
  fy: { startDate: string; endDate: string },
): SprintNavSummary[] {
  return sprints.filter(s => isDateInFinancialYear(s.weekStart, fy))
}

export async function getSprintNavCountsForViewer(): Promise<SprintNavCounts> {
  const [{ isProjects, projectId }, activeFY] = await Promise.all([
    getProjectWorkspaceContext(),
    getActiveFinancialYear(),
  ])

  if (isProjects && projectId) {
    const workstreams = await getProjectWorkstreamsForViewer(projectId)
    const sectionIds = workstreams.map(w => w._id)
    if (sectionIds.length === 0) return emptySprintNavCounts()

    const sprints = filterSprintsForActiveFy(
      await getSprintNavSummariesByWorkstreamIds(sectionIds),
      activeFY,
    )
    const access = await getSectionAccessForViewer(sectionIds[0], 'own')
    return computeSprintNavCounts(sprints, access)
  }

  const sections = await getManagedSectionsForViewer()
  const sectionId = sections[0]?._id
  if (!sectionId) return emptySprintNavCounts()

  const [allSprints, access] = await Promise.all([
    getSprintNavSummariesBySection(sectionId),
    getSectionAccessForViewer(sectionId, 'own'),
  ])

  return computeSprintNavCounts(
    filterSprintsForActiveFy(allSprints, activeFY),
    access,
  )
}
