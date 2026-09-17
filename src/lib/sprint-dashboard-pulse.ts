import type {
  WeeklySprint,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { isSprintInCurrentWeek } from '@/lib/sprint-oversight-counts'
import { resolveSprintTaskStatus } from '@/lib/sprint-task-status'
import { isSprintWeekStarted } from '@/lib/sprint-week'

export type SprintPulsePlanStatus = WeeklySprint['status'] | 'none'

export type ManagerSprintPulse = {
  role: 'manager'
  weekLabel?: string
  planned: { count: number; max: number }
  /** Plan tasks awaiting manager review (pending on submitted sprints). */
  inReview: { tasks: number; sprints: number }
  /** Current-week sprints that are submitted or reviewed. */
  acceptedReady: { count: number; max: number }
  /** Revisions + mid-week still to-do (accepted tasks). */
  atRisk: number
}

export type SupervisorSprintPulse = {
  role: 'supervisor'
  weekLabel?: string
  planned: { count: number; max: number }
  planStatus: SprintPulsePlanStatus
  tasksDone: { done: number; total: number }
  /** Officer evidence pending review + plan tasks needing revision. */
  awaitingYou: {
    evidenceReview: number
    planRevisions: number
  }
}

export type CurrentWeekSprintPulse = ManagerSprintPulse | SupervisorSprintPulse

function currentWeekSprints(
  sprints: WeeklySprint[],
  today: string,
): WeeklySprint[] {
  return sprints.filter(s => isSprintInCurrentWeek(s, today))
}

function uniqueSupervisorCount(sprints: WeeklySprint[]): number {
  const ids = new Set(
    sprints
      .map(s => s.supervisor?._id)
      .filter((id): id is string => Boolean(id)),
  )
  return ids.size > 0 ? ids.size : sprints.length
}

/** Wednesday or later in the sprint week (Mon–Fri). */
function isMidWeekOrLater(today: string, weekStart: string): boolean {
  const t = new Date(today + 'T12:00:00')
  const start = new Date(weekStart + 'T12:00:00')
  const dayOffset = Math.floor(
    (t.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  )
  return dayOffset >= 2
}

function countManagerAtRisk(sprints: WeeklySprint[], today: string): number {
  let atRisk = 0
  for (const sprint of sprints) {
    const weekStarted = isSprintWeekStarted(sprint.weekStart)
    const midWeek = isMidWeekOrLater(today, sprint.weekStart)
    for (const task of sprint.tasks ?? []) {
      if (task.status === 'revisions_requested') {
        atRisk++
        continue
      }
      if (task.status !== 'accepted') continue
      const workflow = resolveSprintTaskStatus(task, sprint.weekStart)
      if (weekStarted && midWeek && workflow === 'to_do') atRisk++
    }
  }
  return atRisk
}

function countPendingPlanReview(sprints: WeeklySprint[]): {
  tasks: number
  sprints: number
} {
  let tasks = 0
  let sprintsWithPending = 0
  for (const sprint of sprints) {
    if (sprint.status !== 'submitted') continue
    const pending = (sprint.tasks ?? []).filter(t => t.status === 'pending')
    if (pending.length === 0) continue
    sprintsWithPending++
    tasks += pending.length
  }
  return { tasks, sprints: sprintsWithPending }
}

function countAcceptedReady(sprints: WeeklySprint[]): number {
  return sprints.filter(
    s => s.status === 'submitted' || s.status === 'reviewed',
  ).length
}

function pickPrimarySprint(sprints: WeeklySprint[]): WeeklySprint | null {
  if (sprints.length === 0) return null
  const preferred =
    sprints.find(s => s.status === 'reviewed') ??
    sprints.find(s => s.status === 'submitted') ??
    sprints.find(s => s.status === 'draft') ??
    sprints[0]
  return preferred ?? null
}

function countTasksDone(sprint: WeeklySprint | null): {
  done: number
  total: number
} {
  if (!sprint) return { done: 0, total: 0 }
  const tasks = sprint.tasks ?? []
  let done = 0
  let total = 0
  for (const task of tasks) {
    if (task.status === 'rejected') continue
    total++
    if (resolveSprintTaskStatus(task, sprint.weekStart) === 'done') done++
  }
  return { done, total }
}

function countAwaitingSupervisor(sprint: WeeklySprint | null): {
  evidenceReview: number
  planRevisions: number
} {
  if (!sprint) return { evidenceReview: 0, planRevisions: 0 }
  let evidenceReview = 0
  let planRevisions = 0
  for (const task of sprint.tasks ?? []) {
    if (task.status === 'revisions_requested') planRevisions++
    if (task.status !== 'accepted') continue
    if (resolveSprintTaskStatus(task, sprint.weekStart) === 'in_review') {
      evidenceReview++
    }
  }
  return { evidenceReview, planRevisions }
}

export function computeManagerSprintPulse(input: {
  sprints: WeeklySprint[]
  today: string
  supervisorCount: number
}): ManagerSprintPulse {
  const week = currentWeekSprints(input.sprints, input.today)
  const max = Math.max(0, input.supervisorCount)
  const plannedRaw = uniqueSupervisorCount(week)
  const planned = max > 0 ? Math.min(plannedRaw, max) : plannedRaw
  const inReview = countPendingPlanReview(week)
  const ready = countAcceptedReady(week)

  return {
    role: 'manager',
    weekLabel: week[0]?.weekLabel,
    planned: { count: planned, max },
    inReview,
    acceptedReady: {
      count: max > 0 ? Math.min(ready, max) : ready,
      max,
    },
    atRisk: countManagerAtRisk(week, input.today),
  }
}

export function computeSupervisorSprintPulse(input: {
  sprints: WeeklySprint[]
  today: string
}): SupervisorSprintPulse {
  const week = currentWeekSprints(input.sprints, input.today)
  const primary = pickPrimarySprint(week)
  const planned = primary ? 1 : 0
  const awaitingYou = countAwaitingSupervisor(primary)

  return {
    role: 'supervisor',
    weekLabel: primary?.weekLabel ?? week[0]?.weekLabel,
    planned: { count: planned, max: 1 },
    planStatus: primary?.status ?? 'none',
    tasksDone: countTasksDone(primary),
    awaitingYou,
  }
}
