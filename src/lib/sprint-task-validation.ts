export const SPRINT_ACTIVITY_CATEGORIES = [
  'normal_flow',
  'compliance',
  'staff_development',
  'stakeholder_engagement',
  'emergency',
] as const

export type SprintActivityCategory = (typeof SPRINT_ACTIVITY_CATEGORIES)[number]

export const SPRINT_ACTIVITY_CATEGORY_OPTIONS: ReadonlyArray<{
  label: string
  value: SprintActivityCategory
}> = [
  { label: 'Normal Flow', value: 'normal_flow' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Staff Development', value: 'staff_development' },
  { label: 'Stakeholder Engagement', value: 'stakeholder_engagement' },
  { label: 'Emergency', value: 'emergency' },
] as const

const CATEGORY_SET = new Set<string>(SPRINT_ACTIVITY_CATEGORIES)

export function isValidSprintActivityCategory(
  v: unknown,
): v is SprintActivityCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v)
}

export function isEmergencySprintCategory(
  category: string | undefined,
): boolean {
  return category === 'emergency'
}

export function sprintTaskRequiresContractLinks(
  category: string | undefined,
): boolean {
  return Boolean(category) && !isEmergencySprintCategory(category)
}

export function isSprintDraftTaskComplete(
  t: {
    description?: string
    activityCategory?: string
    initiativeKey?: string
    activityKey?: string
    contractTaskKey?: string
  },
  options?: { activityHasDetailedTasks?: boolean },
): boolean {
  if (!t.description?.trim() || !t.activityCategory) return false
  if (isEmergencySprintCategory(t.activityCategory)) return true
  if (!t.initiativeKey?.trim() || !t.activityKey?.trim()) return false
  if (options?.activityHasDetailedTasks && !t.contractTaskKey?.trim()) {
    return false
  }
  return true
}

export function sprintDraftNeedsContractInitiatives(
  tasks: Array<{ activityCategory?: string }>,
): boolean {
  return tasks.some(t =>
    sprintTaskRequiresContractLinks(t.activityCategory),
  )
}

export function validateSprintTaskPayload(
  t: {
    description?: string
    activityCategory?: string
    initiativeKey?: string
    initiativeTitle?: string
    activityKey?: string
    activityTitle?: string
    contractTaskKey?: string
    contractTaskTitle?: string
  },
  options?: { activityHasDetailedTasks?: boolean },
): string | null {
  if (!t.description || typeof t.description !== 'string' || !t.description.trim()) {
    return 'Each task must have a description'
  }
  if (!isValidSprintActivityCategory(t.activityCategory)) {
    return 'Each task must have a valid activity category'
  }
  if (!sprintTaskRequiresContractLinks(t.activityCategory)) {
    return null
  }
  if (!t.initiativeKey || typeof t.initiativeKey !== 'string' || !t.initiativeKey.trim()) {
    return 'Each task must have a related initiative'
  }
  if (!t.activityKey || typeof t.activityKey !== 'string' || !t.activityKey.trim()) {
    return 'Each task must have a related measurable activity'
  }
  if (
    options?.activityHasDetailedTasks &&
    (!t.contractTaskKey ||
      typeof t.contractTaskKey !== 'string' ||
      !t.contractTaskKey.trim())
  ) {
    return 'Each task must be linked to a detailed task on the contract'
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

export function buildSprintTaskWriteFields(t: {
  description: string
  activityCategory: string
  initiativeKey?: string
  activityKey?: string
  initiativeTitle?: string
  activityTitle?: string
  contractTaskKey?: string
  contractTaskTitle?: string
}): {
  description: string
  activityCategory: string
  initiativeKey?: string
  activityKey?: string
  initiativeTitle?: string
  activityTitle?: string
  contractTaskKey?: string
  contractTaskTitle?: string
} {
  const base = {
    description: t.description.trim(),
    activityCategory: t.activityCategory,
  }
  if (isEmergencySprintCategory(t.activityCategory)) {
    return base
  }
  return {
    ...base,
    initiativeKey: t.initiativeKey,
    ...(t.initiativeTitle && { initiativeTitle: t.initiativeTitle }),
    activityKey: t.activityKey,
    ...(t.activityTitle && { activityTitle: t.activityTitle }),
    ...(t.contractTaskKey?.trim() && { contractTaskKey: t.contractTaskKey.trim() }),
    ...(t.contractTaskTitle?.trim() && {
      contractTaskTitle: t.contractTaskTitle.trim(),
    }),
  }
}
