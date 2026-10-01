export interface ContractFinalizeActivity {
  _key?: string
  title?: string
  activityType?: string
  targetDate?: string
  assignees?: Array<{ _id?: string } | null> | null
  evidence?: unknown[] | null
}

export interface ContractFinalizeInitiative {
  _key?: string
  title?: string
  code?: string
  cascadeKind?: string
  measurableActivities?: Array<ContractFinalizeActivity | null> | null
}

export interface ContractFinalizeObjective {
  _key?: string
  title?: string
  code?: string
  cascadeKind?: string
  initiatives?: Array<ContractFinalizeInitiative | null> | null
}

export interface ContractFinalizeIssue {
  severity: 'blocker' | 'warning'
  message: string
  location: string
  objectiveKey?: string
  initiativeKey?: string
  activityKey?: string
  objectiveIndex: number
  initiativeIndex?: number
  activityIndex?: number
}

const CORE_TYPES = new Set(['core', 'kpi'])

function hasEvidence(evidence: unknown): boolean {
  if (!Array.isArray(evidence)) return false
  return evidence.some(item => {
    if (!item || typeof item !== 'object') return false
    const row = item as { label?: unknown }
    return typeof row.label === 'string' && row.label.trim().length > 0
  })
}

export type ActivityFinalizeField =
  | 'title'
  | 'type'
  | 'evidence'
  | 'assignees'
  | 'dueDate'

/** Fields on one activity that still block finalization. */
export function activityFinalizeFields(
  activity: ContractFinalizeActivity | null | undefined,
): ActivityFinalizeField[] {
  if (!activity) return ['title', 'type', 'evidence']
  const fields: ActivityFinalizeField[] = []
  if (!activity.title?.trim()) fields.push('title')
  if (!hasType(activity.activityType)) fields.push('type')
  if (!hasEvidence(activity.evidence)) fields.push('evidence')
  if (CORE_TYPES.has(activity.activityType ?? '')) {
    const assigneeCount = (activity.assignees ?? []).filter(
      person => person?._id,
    ).length
    if (assigneeCount === 0) fields.push('assignees')
    if (!activity.targetDate) fields.push('dueDate')
  }
  return fields
}

function hasType(activityType: string | undefined): boolean {
  return (
    activityType === 'core' ||
    activityType === 'kpi' ||
    activityType === 'cross-cutting' ||
    activityType === 'measurable'
  )
}

function place(code: string | undefined, title: string | undefined, fallback: string) {
  const label = title?.trim() || fallback
  return code ? `${code} ${label}` : label
}

/** Issues that must be resolved before a contract can be finalized. */
export function reviewContractForFinalize(
  objectives: Array<ContractFinalizeObjective | null> | null | undefined,
  hiddenKeys?: Iterable<string>,
): ContractFinalizeIssue[] {
  const issues: ContractFinalizeIssue[] = []
  const hidden = new Set(hiddenKeys ?? [])
  const list = objectives ?? []

  const visibleObjectives = list.filter(
    objective => objective && !(objective._key && hidden.has(objective._key)),
  )
  if (visibleObjectives.length === 0) {
    issues.push({
      severity: 'blocker',
      message: 'Add at least one SSMARTA objective.',
      location: 'Contract',
      objectiveIndex: -1,
    })
    return issues
  }

  list.forEach((objective, objectiveIndex) => {
    if (!objective) return
    if (objective._key && hidden.has(objective._key)) return
    const objectiveLabel = place(
      objective.code,
      objective.title,
      `Objective ${objectiveIndex + 1}`,
    )
    const initiatives = (objective.initiatives ?? []).filter(Boolean)
    const visibleInitiatives = initiatives.filter(
      initiative => !initiative?._key || !hidden.has(initiative._key),
    )
    if (visibleInitiatives.length === 0) {
      if (initiatives.length > 0) return
      issues.push({
        severity: 'blocker',
        message: 'Add at least one initiative.',
        location: objectiveLabel,
        objectiveKey: objective._key,
        objectiveIndex,
      })
      return
    }

    initiatives.forEach((initiative, initiativeIndex) => {
      if (!initiative) return
      if (initiative._key && hidden.has(initiative._key)) return
      const initiativeLabel = place(
        initiative.code,
        initiative.title,
        `Initiative ${initiativeIndex + 1}`,
      )
      const activities = (initiative.measurableActivities ?? []).filter(
        activity => activity?.title && String(activity.title).trim(),
      )
      if (activities.length === 0) {
        issues.push({
          severity: 'blocker',
          message: 'Add at least one measurable activity.',
          location: initiativeLabel,
          objectiveKey: objective._key,
          initiativeKey: initiative._key,
          objectiveIndex,
          initiativeIndex,
        })
        return
      }

      activities.forEach((activity, activityIndex) => {
        if (!activity) return
        const activityLabel = place(
          undefined,
          activity.title,
          `Activity ${activityIndex + 1}`,
        )
        const location = `${initiativeLabel} · ${activityLabel}`
        const base = {
          location,
          objectiveKey: objective._key,
          initiativeKey: initiative._key,
          activityKey: activity._key,
          objectiveIndex,
          initiativeIndex,
          activityIndex,
        }
        if (!hasType(activity.activityType)) {
          issues.push({
            ...base,
            severity: 'blocker',
            message: 'Choose Core or Cross-cutting.',
          })
        }
        if (!hasEvidence(activity.evidence)) {
          issues.push({
            ...base,
            severity: 'blocker',
            message: 'Add expected evidence.',
          })
        }
        if (CORE_TYPES.has(activity.activityType ?? '')) {
          const assigneeCount = (activity.assignees ?? []).filter(
            person => person?._id,
          ).length
          if (assigneeCount === 0) {
            issues.push({
              ...base,
              severity: 'blocker',
              message: 'Assign at least one person.',
            })
          }
          if (!activity.targetDate) {
            issues.push({
              ...base,
              severity: 'blocker',
              message: 'Set a due date.',
            })
          }
        }
      })
    })
  })

  return issues
}

export function contractFinalizeAttentionKeys(
  issues: ContractFinalizeIssue[],
): Set<string> {
  const keys = new Set<string>()
  for (const issue of issues) {
    if (issue.severity !== 'blocker') continue
    if (issue.activityKey) keys.add(issue.activityKey)
    if (issue.initiativeKey) keys.add(issue.initiativeKey)
    if (issue.objectiveKey) keys.add(issue.objectiveKey)
  }
  return keys
}
