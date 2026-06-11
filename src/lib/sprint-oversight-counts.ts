import type {
  SprintTask,
  WeeklySprint,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

function sprintActivityKey(task: SprintTask): string {
  return task.activityKey?.trim() || task._key
}

export function countUniqueSprintActivities(tasks: SprintTask[]): number {
  if (tasks.length === 0) return 0
  return new Set(tasks.map(sprintActivityKey)).size
}

export function collectSprintTasks(
  sprints: WeeklySprint[],
  matchesSprint: (sprint: WeeklySprint) => boolean,
  filterTask?: (task: SprintTask) => boolean,
): SprintTask[] {
  const tasks: SprintTask[] = []

  for (const sprint of sprints) {
    if (!matchesSprint(sprint)) continue
    for (const task of sprint.tasks ?? []) {
      if (!filterTask || filterTask(task)) {
        tasks.push(task)
      }
    }
  }

  return tasks
}

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
): { activities: number; tasks: number } {
  const tasks = collectSprintTasks(sprints, matchesSprint, filterTask)

  return {
    activities: countUniqueSprintActivities(tasks),
    tasks: tasks.length,
  }
}
