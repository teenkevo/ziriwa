export const VIRTUAL_SPRINT_UNSUBMITTED_PREFIX = 'virtual:sprint-unsubmitted:'

export function isVirtualNotificationId(id: string): boolean {
  return id.startsWith(VIRTUAL_SPRINT_UNSUBMITTED_PREFIX)
}
