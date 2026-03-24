export const SPRINT_ACTIVITY_CATEGORIES = [
  'normal_flow',
  'compliance',
  'staff_development',
  'stakeholder_engagement',
] as const

export type SprintActivityCategory = (typeof SPRINT_ACTIVITY_CATEGORIES)[number]

const CATEGORY_SET = new Set<string>(SPRINT_ACTIVITY_CATEGORIES)

export function isValidSprintActivityCategory(
  v: unknown,
): v is SprintActivityCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v)
}

export function validateSprintTaskPayload(t: {
  description?: string
  activityCategory?: string
  initiativeKey?: string
  initiativeTitle?: string
  activityKey?: string
  activityTitle?: string
}): string | null {
  if (!t.description || typeof t.description !== 'string' || !t.description.trim()) {
    return 'Each task must have a description'
  }
  if (!isValidSprintActivityCategory(t.activityCategory)) {
    return 'Each task must have a valid activity category'
  }
  if (!t.initiativeKey || typeof t.initiativeKey !== 'string' || !t.initiativeKey.trim()) {
    return 'Each task must have a related initiative'
  }
  if (!t.activityKey || typeof t.activityKey !== 'string' || !t.activityKey.trim()) {
    return 'Each task must have a related measurable activity'
  }
  return null
}

export function sprintTaskHasRequiredLinks(t: Record<string, unknown>): boolean {
  return validateSprintTaskPayload({
    description: typeof t.description === 'string' ? t.description : '',
    activityCategory: t.activityCategory as string | undefined,
    initiativeKey: t.initiativeKey as string | undefined,
    activityKey: t.activityKey as string | undefined,
  }) === null
}
