import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export function countReportableSprintTasks(sprint: WeeklySprint): number {
  return (sprint.tasks ?? []).filter(task => {
    const hasDoneStatus =
      task.taskStatus === 'delivered' || task.taskStatus === 'done'
    const hasSubmission = (task.workSubmissions ?? []).length > 0
    return task.status === 'accepted' || hasDoneStatus || hasSubmission
  }).length
}

export function isCurrentWeekSprint(sprint: WeeklySprint, today: string): boolean {
  return Boolean(
    sprint.weekStart &&
      sprint.weekEnd &&
      sprint.weekStart <= today &&
      today <= sprint.weekEnd,
  )
}

export function isWeeklyDivisionReportReady(
  sectionResults: { sprints: WeeklySprint[] }[],
  today: string,
): boolean {
  let sectionsRequiringReport = 0

  for (const section of sectionResults) {
    const currentSprint = section.sprints.find(sprint =>
      isCurrentWeekSprint(sprint, today),
    )
    if (!currentSprint) continue

    sectionsRequiringReport++
    if (countReportableSprintTasks(currentSprint) === 0) return false
  }

  return sectionsRequiringReport > 0
}
