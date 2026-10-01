import {
  displayedActivityOrder,
  leadershipActivityNumber,
} from '@/lib/contract-numbering'

export interface ContractFinalizeActivity {
  _key?: string
  title?: string
  activityType?: string
  targetDate?: string
  assignees?: Array<{ _id?: string } | null> | null
  evidence?: unknown[] | null
  cascadeSource?: { nodeRole?: string } | null
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

export type ContractFinalizeSubject =
  | 'contract'
  | 'objective'
  | 'initiative'
  | 'activity'

export interface ContractFinalizeIssue {
  severity: 'blocker' | 'warning'
  message: string
  location: string
  subject: ContractFinalizeSubject
  /** Title of the contract item this issue belongs to. */
  label: string
  /** Initiative display code, when the issue sits on an initiative or activity. */
  code?: string
  objectiveCode?: string
  objectiveName?: string
  /** Activity that needs the fix, when the issue is on an activity. */
  activityCode?: string
  activityLabel?: string
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

function objectiveNameAndCode(
  objective: ContractFinalizeObjective,
  objectiveIndex: number,
) {
  const code = objective.code?.trim() || String(objectiveIndex + 1)
  const name = objective.title?.trim() || `Objective ${objectiveIndex + 1}`
  return { code, name, label: `${code} ${name}` }
}

function initiativeNameAndCode(
  initiative: ContractFinalizeInitiative,
  objective: ContractFinalizeObjective,
  objectiveIndex: number,
  initiativeIndex: number,
) {
  const objectiveCode = objective.code?.trim() || String(objectiveIndex + 1)
  const code =
    initiative.code?.trim() || `${objectiveCode}.${initiativeIndex + 1}`
  const name = initiative.title?.trim() || `Initiative ${initiativeIndex + 1}`
  return { code, name, label: `${code} ${name}` }
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
      message: 'Add at least one SSMARTA objective to the contract.',
      location: 'Contract',
      subject: 'contract',
      label: 'This contract',
      objectiveIndex: -1,
    })
    return issues
  }

  list.forEach((objective, objectiveIndex) => {
    if (!objective) return
    if (objective._key && hidden.has(objective._key)) return
    const objectiveName = objectiveNameAndCode(objective, objectiveIndex)
    const objectiveLabel = objectiveName.label
    const initiatives = (objective.initiatives ?? []).filter(Boolean)
    const visibleInitiatives = initiatives.filter(
      initiative => !initiative?._key || !hidden.has(initiative._key),
    )
    if (visibleInitiatives.length === 0) {
      if (initiatives.length > 0) return
      issues.push({
        severity: 'blocker',
        message: 'Add at least one initiative to the objective.',
        location: objectiveLabel,
        subject: 'objective',
        label: objectiveName.name,
        code: objectiveName.code,
        objectiveCode: objectiveName.code,
        objectiveName: objectiveName.name,
        objectiveKey: objective._key,
        objectiveIndex,
      })
      return
    }

    initiatives.forEach((initiative, initiativeIndex) => {
      if (!initiative) return
      if (initiative._key && hidden.has(initiative._key)) return
      const initiativeName = initiativeNameAndCode(
        initiative,
        objective,
        objectiveIndex,
        initiativeIndex,
      )
      const initiativeLabel = initiativeName.label
      const activities = (initiative.measurableActivities ?? []).filter(
        activity => activity?.title && String(activity.title).trim(),
      )
      if (activities.length === 0) {
        issues.push({
          severity: 'blocker',
          message: 'Add at least one measurable activity to the initiative.',
          location: initiativeLabel,
          subject: 'initiative',
          label: initiativeName.name,
          code: initiativeName.code,
          objectiveCode: objectiveName.code,
          objectiveName: objectiveName.name,
          objectiveKey: objective._key,
          initiativeKey: initiative._key,
          objectiveIndex,
          initiativeIndex,
        })
        return
      }

      ;(initiative.measurableActivities ?? []).forEach(
        (activity, activityIndex) => {
        if (!activity?.title || !String(activity.title).trim()) return
        const activityOrder = displayedActivityOrder(
          initiative.measurableActivities ?? [],
          activityIndex,
        )
        const activityCode = leadershipActivityNumber(
          initiativeName.code,
          activity,
          activityOrder,
        )
        const activityLabel = activity.title.trim()
        const location = `${initiativeLabel} · ${activityCode} ${activityLabel}`
        const base = {
          location,
          subject: 'activity' as const,
          label: initiativeName.name,
          code: initiativeName.code,
          objectiveCode: objectiveName.code,
          objectiveName: objectiveName.name,
          activityCode,
          activityLabel,
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
            message: 'Choose Core or Cross-cutting for the measurable activity.',
          })
        }
        if (!hasEvidence(activity.evidence)) {
          issues.push({
            ...base,
            severity: 'blocker',
            message: 'Add expected evidence to the measurable activity.',
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
              message: 'Assign at least one person to the measurable activity.',
            })
          }
          if (!activity.targetDate) {
            issues.push({
              ...base,
              severity: 'blocker',
              message: 'Set a due date on the measurable activity.',
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
