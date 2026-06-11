import type {
  SprintTask,
  WeeklySprint,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export function isSprintInCurrentWeek(
  sprint: WeeklySprint,
  today: string,
): boolean {
  return Boolean(
    sprint.weekStart &&
      sprint.weekEnd &&
      sprint.weekStart <= today &&
      today <= sprint.weekEnd,
  )
}

export function isSprintInCalendarMonth(
  sprint: WeeklySprint,
  today: string,
): boolean {
  return Boolean(
    sprint.weekStart && sprint.weekStart.slice(0, 7) === today.slice(0, 7),
  )
}

export function computeSprintOversightCounts(
  sprints: WeeklySprint[],
  matchesSprint: (sprint: WeeklySprint) => boolean,
  filterTask?: (task: SprintTask) => boolean,
): { sprints: number; tasks: number } {
  let sprintCount = 0
  const tasks: SprintTask[] = []

  for (const sprint of sprints) {
    if (!matchesSprint(sprint)) continue

    const sprintTasks = (sprint.tasks ?? []).filter(
      task => !filterTask || filterTask(task),
    )

    if (filterTask && sprintTasks.length === 0) continue

    sprintCount++
    tasks.push(...sprintTasks)
  }

  return {
    sprints: sprintCount,
    tasks: tasks.length,
  }
}
