import 'server-only'

import { getSprintActivityCategoryLabel } from '@/lib/sprint-task-validation'
import { isSprintWeekStarted } from '@/lib/sprint-week'
import { client } from '@/sanity/lib/client'

export type SprintAtRiskRecipientRole = 'manager' | 'supervisor' | 'officer'

export interface SprintMissingSubmissionRow {
  sprintId: string
  weekLabel: string
  weekStart: string
  sectionId: string
  sectionName: string
  sectionSlug?: string
  managerId: string
  supervisorName: string
  taskKey: string
  activityLabel: string
  categoryLabel: string
  assigneeName: string
  taskStatusLabel: string
}

export interface SprintMissingSubmissionsBundle {
  recipientId: string
  recipientEmail: string
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  weekLabel: string
  rows: SprintMissingSubmissionRow[]
}

/** @deprecated Use SprintMissingSubmissionsBundle */
export type ManagerMissingSubmissionsBundle = SprintMissingSubmissionsBundle

interface SprintQueryRow {
  _id: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  sectionId: string
  sectionName: string
  sectionSlug?: string
  managerId?: string
  managerEmail?: string
  managerName?: string
  supervisorId?: string
  supervisorEmail?: string
  supervisorName?: string
  tasks?: {
    _key: string
    description?: string
    activityTitle?: string
    contractTaskTitle?: string
    activityCategory?: string
    status?: string
    assigneeId?: string
    assigneeEmail?: string
    assigneeName?: string
    taskStatus?: string
    submissionCount?: number
  }[]
}

const TASK_STATUS_LABELS: Record<string, string> = {
  to_do: 'To do',
  in_progress: 'In progress',
  delivered: 'Delivered',
  in_review: 'In review',
  done: 'Done',
}

function getActivityLabel(task: {
  activityTitle?: string
  contractTaskTitle?: string
  description?: string
}): string {
  return (
    task.activityTitle?.trim() ||
    task.contractTaskTitle?.trim() ||
    task.description?.trim() ||
    'Untitled activity'
  )
}

function getTaskStatusLabel(taskStatus?: string): string {
  if (!taskStatus) return 'To do'
  return TASK_STATUS_LABELS[taskStatus] ?? taskStatus
}

function sortRows(rows: SprintMissingSubmissionRow[]): SprintMissingSubmissionRow[] {
  return rows.sort((a, b) => {
    const sectionCompare = a.sectionName.localeCompare(b.sectionName)
    if (sectionCompare !== 0) return sectionCompare
    return a.activityLabel.localeCompare(b.activityLabel)
  })
}

function finalizeBundle(
  bundle: SprintMissingSubmissionsBundle,
): SprintMissingSubmissionsBundle {
  const rows = sortRows(bundle.rows)
  const weekLabels = [...new Set(rows.map(row => row.weekLabel).filter(Boolean))]

  return {
    ...bundle,
    weekLabel: weekLabels.join(' · ') || bundle.weekLabel,
    rows,
  }
}

function bundleKey(
  role: SprintAtRiskRecipientRole,
  recipientId: string,
): string {
  return `${role}:${recipientId}`
}

export async function fetchSprintMissingSubmissionBundles(
  today: string,
): Promise<SprintMissingSubmissionsBundle[]> {
  const sprints = await client.fetch<SprintQueryRow[]>(
    /* groq */ `*[_type == "weeklySprint"
      && status in ["submitted", "reviewed"]
      && weekStart <= $today && weekEnd >= $today
      && !defined(section->project._ref)
    ] | order(section->name asc, weekStart desc) {
      _id,
      weekLabel,
      weekStart,
      weekEnd,
      "sectionId": section._ref,
      "sectionName": section->name,
      "sectionSlug": section->slug.current,
      "managerId": section->manager._ref,
      "managerEmail": section->manager->email,
      "managerName": coalesce(section->manager->fullName, section->manager->firstName + " " + section->manager->lastName),
      "supervisorId": supervisor._ref,
      "supervisorEmail": supervisor->email,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      tasks[] {
        _key,
        description,
        activityTitle,
        contractTaskTitle,
        activityCategory,
        status,
        "assigneeId": assignee._ref,
        "assigneeEmail": assignee->email,
        "assigneeName": coalesce(assignee->fullName, assignee->firstName + " " + assignee->lastName),
        taskStatus,
        "submissionCount": count(coalesce(workSubmissions, []))
      }
    }`,
    { today },
  )

  const bundles = new Map<string, SprintMissingSubmissionsBundle>()

  for (const sprint of sprints ?? []) {
    if (!isSprintWeekStarted(sprint.weekStart)) continue

    const atRiskTasks = (sprint.tasks ?? []).filter(
      task =>
        task.status === 'accepted' && (task.submissionCount ?? 0) === 0,
    )
    if (atRiskTasks.length === 0) continue

    for (const task of atRiskTasks) {
      if (!sprint.managerId) continue

      const row: SprintMissingSubmissionRow = {
        sprintId: sprint._id,
        weekLabel: sprint.weekLabel,
        weekStart: sprint.weekStart,
        sectionId: sprint.sectionId,
        sectionName: sprint.sectionName,
        sectionSlug: sprint.sectionSlug,
        managerId: sprint.managerId,
        supervisorName: sprint.supervisorName?.trim() || '—',
        taskKey: task._key,
        activityLabel: getActivityLabel(task),
        categoryLabel: getSprintActivityCategoryLabel(task.activityCategory),
        assigneeName: task.assigneeName?.trim() || 'Unassigned',
        taskStatusLabel: getTaskStatusLabel(task.taskStatus),
      }

      if (sprint.managerId && sprint.managerEmail) {
        const key = bundleKey('manager', sprint.managerId)
        const existing = bundles.get(key)
        const bundle =
          existing ??
          ({
            recipientId: sprint.managerId,
            recipientEmail: sprint.managerEmail.trim().toLowerCase(),
            recipientName: sprint.managerName?.trim() || 'Manager',
            recipientRole: 'manager',
            weekLabel: sprint.weekLabel,
            rows: [],
          } satisfies SprintMissingSubmissionsBundle)
        bundle.rows.push(row)
        bundles.set(key, bundle)
      }

      if (sprint.supervisorId && sprint.supervisorEmail) {
        const key = bundleKey('supervisor', sprint.supervisorId)
        const existing = bundles.get(key)
        const bundle =
          existing ??
          ({
            recipientId: sprint.supervisorId,
            recipientEmail: sprint.supervisorEmail.trim().toLowerCase(),
            recipientName: sprint.supervisorName?.trim() || 'Supervisor',
            recipientRole: 'supervisor',
            weekLabel: sprint.weekLabel,
            rows: [],
          } satisfies SprintMissingSubmissionsBundle)
        bundle.rows.push(row)
        bundles.set(key, bundle)
      }

      if (task.assigneeId && task.assigneeEmail) {
        const key = bundleKey('officer', task.assigneeId)
        const existing = bundles.get(key)
        const bundle =
          existing ??
          ({
            recipientId: task.assigneeId,
            recipientEmail: task.assigneeEmail.trim().toLowerCase(),
            recipientName: task.assigneeName?.trim() || 'Officer',
            recipientRole: 'officer',
            weekLabel: sprint.weekLabel,
            rows: [],
          } satisfies SprintMissingSubmissionsBundle)
        bundle.rows.push(row)
        bundles.set(key, bundle)
      }
    }
  }

  return [...bundles.values()]
    .map(finalizeBundle)
    .filter(bundle => bundle.rows.length > 0)
}

export async function fetchSprintMissingSubmissionBundleForRecipient(
  recipientId: string,
  recipientRole: SprintAtRiskRecipientRole,
  today = new Date().toISOString().slice(0, 10),
): Promise<SprintMissingSubmissionsBundle | null> {
  const bundles = await fetchSprintMissingSubmissionBundles(today)
  return (
    bundles.find(
      bundle =>
        bundle.recipientId === recipientId &&
        bundle.recipientRole === recipientRole,
    ) ?? null
  )
}

/** Manager, supervisor, and officer bundles scoped to a manager's sections. */
export async function fetchSprintMissingSubmissionBundlesForManagerScope(
  managerId: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<SprintMissingSubmissionsBundle[]> {
  const bundles = await fetchSprintMissingSubmissionBundles(today)

  return bundles
    .map(bundle => ({
      ...bundle,
      rows: bundle.rows.filter(row => row.managerId === managerId),
    }))
    .map(finalizeBundle)
    .filter(bundle => bundle.rows.length > 0)
}

/** @deprecated Use fetchSprintMissingSubmissionBundleForRecipient */
export async function fetchSprintMissingSubmissionBundleForManager(
  managerId: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<SprintMissingSubmissionsBundle | null> {
  return fetchSprintMissingSubmissionBundleForRecipient(
    managerId,
    'manager',
    today,
  )
}
