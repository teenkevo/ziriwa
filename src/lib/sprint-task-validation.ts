import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import { hasRichTextContent } from '@/lib/rich-text'

export const MAINSTREAM_SPRINT_ACTIVITY_CATEGORIES = [
  'normal_flow',
  'compliance',
  'staff_development',
  'stakeholder_engagement',
  'emergency',
] as const

export const PROJECT_SPRINT_ACTIVITY_CATEGORIES = [
  'staff_development',
  'stakeholder_engagement',
  'software_development',
  'data_management',
  'change_management',
  'uat_pilot',
] as const

export const SPRINT_ACTIVITY_CATEGORIES = [
  'normal_flow',
  'compliance',
  'staff_development',
  'stakeholder_engagement',
  'emergency',
  'software_development',
  'data_management',
  'change_management',
  'uat_pilot',
] as const

export type MainstreamSprintActivityCategory =
  (typeof MAINSTREAM_SPRINT_ACTIVITY_CATEGORIES)[number]

export type ProjectSprintActivityCategory =
  (typeof PROJECT_SPRINT_ACTIVITY_CATEGORIES)[number]

export type SprintActivityCategory = (typeof SPRINT_ACTIVITY_CATEGORIES)[number]

export const SPRINT_ACTIVITY_CATEGORY_LABELS: Record<
  SprintActivityCategory,
  string
> = {
  normal_flow: 'Normal Flow',
  compliance: 'Compliance',
  staff_development: 'Staff Development',
  stakeholder_engagement: 'Stakeholder Engagement',
  emergency: 'Emergency',
  software_development: 'Software Development',
  data_management: 'Data Management',
  change_management: 'Change Management',
  uat_pilot: 'UAT / Pilot',
}

export const MAINSTREAM_SPRINT_ACTIVITY_CATEGORY_OPTIONS: ReadonlyArray<{
  label: string
  value: MainstreamSprintActivityCategory
}> = [
  { label: 'Normal Flow', value: 'normal_flow' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Staff Development', value: 'staff_development' },
  { label: 'Stakeholder Engagement', value: 'stakeholder_engagement' },
  { label: 'Emergency', value: 'emergency' },
] as const

export const PROJECT_SPRINT_ACTIVITY_CATEGORY_OPTIONS: ReadonlyArray<{
  label: string
  value: ProjectSprintActivityCategory
}> = [
  { label: 'Staff Development', value: 'staff_development' },
  { label: 'Stakeholder Engagement', value: 'stakeholder_engagement' },
  { label: 'Software Development', value: 'software_development' },
  { label: 'Data Management', value: 'data_management' },
  { label: 'Change Management', value: 'change_management' },
  { label: 'UAT / Pilot', value: 'uat_pilot' },
] as const

/** @deprecated Use getSprintActivityCategoryOptions(workspaceScope) instead. */
export const SPRINT_ACTIVITY_CATEGORY_OPTIONS =
  MAINSTREAM_SPRINT_ACTIVITY_CATEGORY_OPTIONS

const ALL_CATEGORY_SET = new Set<string>(SPRINT_ACTIVITY_CATEGORIES)
const MAINSTREAM_CATEGORY_SET = new Set<string>(
  MAINSTREAM_SPRINT_ACTIVITY_CATEGORIES,
)
const PROJECT_CATEGORY_SET = new Set<string>(PROJECT_SPRINT_ACTIVITY_CATEGORIES)

export function isProjectSprintScope(
  scope: WorkspaceScopeKind = 'mainstream',
): boolean {
  return scope === 'project' || scope === 'workstream'
}

export function getSprintActivityCategoryOptions(
  scope: WorkspaceScopeKind = 'mainstream',
) {
  return isProjectSprintScope(scope)
    ? PROJECT_SPRINT_ACTIVITY_CATEGORY_OPTIONS
    : MAINSTREAM_SPRINT_ACTIVITY_CATEGORY_OPTIONS
}

/** Keys shown on the dashboard activity-category chart for a workspace scope. */
export function getDashboardActivityCategoryKeys(
  scope: WorkspaceScopeKind = 'mainstream',
): readonly string[] {
  return isProjectSprintScope(scope)
    ? [...PROJECT_SPRINT_ACTIVITY_CATEGORIES, 'uncategorized']
    : [...MAINSTREAM_SPRINT_ACTIVITY_CATEGORIES, 'uncategorized']
}

export function getSprintActivityCategoryLabel(
  category: string | undefined,
): string {
  if (!category) return ''
  return (
    SPRINT_ACTIVITY_CATEGORY_LABELS[category as SprintActivityCategory] ??
    category
  )
}

export function isValidSprintActivityCategory(
  v: unknown,
): v is SprintActivityCategory {
  return typeof v === 'string' && ALL_CATEGORY_SET.has(v)
}

export function isValidSprintActivityCategoryForSection(
  v: unknown,
  isProjectSection: boolean,
): v is SprintActivityCategory {
  const allowed = isProjectSection ? PROJECT_CATEGORY_SET : MAINSTREAM_CATEGORY_SET
  return typeof v === 'string' && allowed.has(v)
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
  if (!hasRichTextContent(t.description) || !t.activityCategory) return false
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
  options?: {
    activityHasDetailedTasks?: boolean
    isProjectSection?: boolean
  },
): string | null {
  if (!hasRichTextContent(t.description)) {
    return 'Each task must have a description'
  }
  const categoryValid =
    options?.isProjectSection === undefined
      ? isValidSprintActivityCategory(t.activityCategory)
      : isValidSprintActivityCategoryForSection(
          t.activityCategory,
          options.isProjectSection,
        )
  if (!categoryValid) {
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

export function sprintTaskHasRequiredLinks(
  t: Record<string, unknown>,
  options?: { isProjectSection?: boolean },
): boolean {
  return (
    validateSprintTaskPayload(
      {
        description: typeof t.description === 'string' ? t.description : '',
        activityCategory: t.activityCategory as string | undefined,
        initiativeKey: t.initiativeKey as string | undefined,
        activityKey: t.activityKey as string | undefined,
        contractTaskKey: t.contractTaskKey as string | undefined,
      },
      options,
    ) === null
  )
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
