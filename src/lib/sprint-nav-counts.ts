import type { SectionAccess } from '@/lib/section-access'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import {
  scopeSprintsForViewer,
  shouldScopeSprintsToOfficer,
} from '@/lib/sprint-workspace-scope'

export interface SprintNavCounts {
  ready: number
  inReview: number
  drafts: number
}

const EMPTY_SPRINT_NAV_COUNTS: SprintNavCounts = {
  ready: 0,
  inReview: 0,
  drafts: 0,
}

export function emptySprintNavCounts(): SprintNavCounts {
  return { ...EMPTY_SPRINT_NAV_COUNTS }
}

function isInReviewSprint(sprint: WeeklySprint): boolean {
  if (sprint.status === 'submitted') return true
  if (sprint.status !== 'reviewed') return false
  const tasks = sprint.tasks ?? []
  const allAccepted =
    tasks.length > 0 && tasks.every(t => t.status === 'accepted')
  return !allAccepted
}

/** Counts for sidebar sprint links — mirrors WeeklySprintContent tab lists. */
export function computeSprintNavCounts(
  sprints: WeeklySprint[],
  access: SectionAccess,
): SprintNavCounts {
  const scoped = scopeSprintsForViewer(sprints, access)
  const officerScoped = shouldScopeSprintsToOfficer(access)
  const viewerStaffId =
    access.officerContextStaffId ?? access.viewerStaffId ?? null

  let ready = 0
  for (const sprint of scoped) {
    for (const task of sprint.tasks ?? []) {
      if (task.status !== 'accepted') continue
      if (officerScoped && viewerStaffId && task.assignee !== viewerStaffId) {
        continue
      }
      ready++
    }
  }

  return {
    ready,
    inReview: scoped.filter(isInReviewSprint).length,
    drafts: scoped.filter(s => s.status === 'draft').length,
  }
}
