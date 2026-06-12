import { format, parseISO } from 'date-fns'

import { resolveSprintTaskStatus } from '@/lib/sprint-task-status'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export type SprintVelocityWeek = {
  sprintId: string | null
  weekLabel: string
  weekShort: string
  weekStart: string
  weekEnd: string
  committed: number
  fulfilled: number
  hasSprint: boolean
}

export type SprintVelocitySummary = {
  weeks: SprintVelocityWeek[]
  currentSprint: {
    weekLabel: string
    committed: number
    fulfilled: number
  } | null
  averageFulfilled: number
}

export function shortenSprintWeekLabel(weekLabel: string): string {
  const trimmed = weekLabel.trim()
  if (!trimmed) return weekLabel
  return (
    trimmed.replace(/Week\s+/i, 'W').replace(/\s+\d{4}$/, '') || trimmed
  )
}

function countSprintTasks(sprint: WeeklySprint) {
  const tasks = sprint.tasks ?? []
  let committed = 0
  let fulfilled = 0
  for (const task of tasks) {
    committed++
    if (resolveSprintTaskStatus(task, sprint.weekStart) === 'done') fulfilled++
  }
  return { committed, fulfilled }
}

/** Monday of the calendar week containing `isoDate` (matches section sprint weeks). */
function getMondayWeekStart(isoDate: string): string {
  const date = parseISO(isoDate)
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diffToMonday)
  return format(date, 'yyyy-MM-dd')
}

function addDaysToIso(isoDate: string, days: number): string {
  const date = parseISO(isoDate)
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}

function formatEmptyWeekLabel(weekStart: string): string {
  try {
    return `Week of ${format(parseISO(weekStart), 'MMM d, yyyy')}`
  } catch {
    return weekStart
  }
}

function formatEmptyWeekShort(weekStart: string): string {
  try {
    return format(parseISO(weekStart), 'MMM d')
  } catch {
    return weekStart
  }
}

/** Last N calendar weeks (Mon–Fri), oldest first, including weeks with no sprint. */
function buildCalendarWeekSlots(today: string, weekCount: number) {
  const currentMonday = getMondayWeekStart(today)
  const slots: { weekStart: string; weekEnd: string }[] = []

  for (let offset = weekCount - 1; offset >= 0; offset--) {
    const weekStart = addDaysToIso(currentMonday, -7 * offset)
    const weekEnd = addDaysToIso(weekStart, 4)
    slots.push({ weekStart, weekEnd })
  }

  return slots
}

export function computeSprintVelocitySummary(
  sprints: WeeklySprint[],
  today: string,
  weekCount = 7,
): SprintVelocitySummary {
  const sprintByWeekStart = new Map<string, WeeklySprint>()
  for (const sprint of sprints) {
    if (sprint.weekStart) {
      sprintByWeekStart.set(sprint.weekStart, sprint)
    }
  }

  const calendarWeeks = buildCalendarWeekSlots(today, weekCount)
  const weeks: SprintVelocityWeek[] = calendarWeeks.map(slot => {
    const sprint = sprintByWeekStart.get(slot.weekStart)
    if (!sprint) {
      return {
        sprintId: null,
        weekLabel: formatEmptyWeekLabel(slot.weekStart),
        weekShort: formatEmptyWeekShort(slot.weekStart),
        weekStart: slot.weekStart,
        weekEnd: slot.weekEnd,
        committed: 0,
        fulfilled: 0,
        hasSprint: false,
      }
    }

    const { committed, fulfilled } = countSprintTasks(sprint)
    return {
      sprintId: sprint._id,
      weekLabel: sprint.weekLabel,
      weekShort: shortenSprintWeekLabel(sprint.weekLabel),
      weekStart: sprint.weekStart,
      weekEnd: sprint.weekEnd,
      committed,
      fulfilled,
      hasSprint: true,
    }
  })

  const currentWeekSlot = calendarWeeks[calendarWeeks.length - 1]
  const currentSprintDoc = sprintByWeekStart.get(currentWeekSlot.weekStart)
  const currentSprint = currentSprintDoc
    ? (() => {
        const { committed, fulfilled } = countSprintTasks(currentSprintDoc)
        return {
          weekLabel: currentSprintDoc.weekLabel,
          committed,
          fulfilled,
        }
      })()
    : null

  const averageFulfilled =
    weeks.length === 0
      ? 0
      : Math.round(
          (weeks.reduce((acc, week) => acc + week.fulfilled, 0) / weeks.length) *
            10,
        ) / 10

  return {
    weeks,
    currentSprint,
    averageFulfilled,
  }
}
