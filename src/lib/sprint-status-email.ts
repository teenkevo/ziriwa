import 'server-only'

import {
  getSprintTaskStatusLabel,
  resolveSprintTaskStatus,
  type SprintTaskWorkflowStatus,
} from '@/lib/sprint-task-status'
import { getRichTextPlainText } from '@/lib/rich-text'
import { isSprintWeekStarted } from '@/lib/sprint-week'
import type { SprintAtRiskRecipientRole } from '@/lib/sprint-missing-submissions'
import type { SprintTask } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { client } from '@/sanity/lib/client'

export interface SprintStatusEmailRow {
  taskDescription: string
  assigneeName: string
  statusLabel: string
  evidenceLabel: string
  workflowStatus: SprintTaskWorkflowStatus
}

export interface SprintStatusSummary {
  total: number
  done: number
  inReview: number
  inProgress: number
  toDo: number
}

export interface SprintStatusEmailBundle {
  recipientId: string
  recipientEmail: string
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  sprintId: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  sectionName: string
  rows: SprintStatusEmailRow[]
  summary: SprintStatusSummary
}

interface SprintQueryRow {
  _id: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  sectionId: string
  sectionName: string
  managerId?: string
  managerEmail?: string
  managerName?: string
  supervisorId?: string
  supervisorEmail?: string
  supervisorName?: string
  tasks?: {
    _key: string
    description?: string
    status?: string
    assigneeId?: string
    assigneeEmail?: string
    assigneeName?: string
    taskStatus?: string
    submissionCount?: number
    workSubmissions?: { status?: string }[]
  }[]
}

function buildStatusRow(
  task: NonNullable<SprintQueryRow['tasks']>[number],
  weekStart: string,
  now: Date,
): SprintStatusEmailRow {
  const workflowStatus = resolveSprintTaskStatus(
    {
      status: task.status as SprintTask['status'],
      taskStatus: task.taskStatus as SprintTask['taskStatus'],
      workSubmissions: task.workSubmissions as SprintTask['workSubmissions'],
    },
    weekStart,
    now,
  )
  const submissionCount = task.submissionCount ?? 0

  return {
    taskDescription: getRichTextPlainText(task.description, 'Untitled activity'),
    assigneeName: task.assigneeName?.trim() || 'Unassigned',
    statusLabel: getSprintTaskStatusLabel(workflowStatus),
    evidenceLabel:
      submissionCount === 0
        ? 'None'
        : `${submissionCount} submission${submissionCount === 1 ? '' : 's'}`,
    workflowStatus,
  }
}

function buildSummary(
  statuses: SprintTaskWorkflowStatus[],
): SprintStatusSummary {
  const summary: SprintStatusSummary = {
    total: statuses.length,
    done: 0,
    inReview: 0,
    inProgress: 0,
    toDo: 0,
  }

  for (const status of statuses) {
    if (status === 'done' || status === 'delivered') summary.done++
    else if (status === 'in_review') summary.inReview++
    else if (status === 'in_progress') summary.inProgress++
    else summary.toDo++
  }

  return summary
}

function bundleKey(
  role: SprintAtRiskRecipientRole,
  recipientId: string,
  sprintId: string,
): string {
  return `${role}:${recipientId}:${sprintId}`
}

function sortRows(rows: SprintStatusEmailRow[]): SprintStatusEmailRow[] {
  return rows.sort((a, b) => a.taskDescription.localeCompare(b.taskDescription))
}

function finalizeBundle(bundle: SprintStatusEmailBundle): SprintStatusEmailBundle {
  const rows = sortRows(bundle.rows)

  return {
    ...bundle,
    rows,
    summary: buildSummary(rows.map(row => row.workflowStatus)),
  }
}

export async function fetchSprintStatusEmailBundles(
  today: string,
  now: Date = new Date(),
): Promise<SprintStatusEmailBundle[]> {
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
      "managerId": section->manager._ref,
      "managerEmail": section->manager->email,
      "managerName": coalesce(section->manager->fullName, section->manager->firstName + " " + section->manager->lastName),
      "supervisorId": supervisor._ref,
      "supervisorEmail": supervisor->email,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      tasks[status == "accepted"] {
        _key,
        description,
        status,
        "assigneeId": assignee._ref,
        "assigneeEmail": assignee->email,
        "assigneeName": coalesce(assignee->fullName, assignee->firstName + " " + assignee->lastName),
        taskStatus,
        "submissionCount": count(coalesce(workSubmissions, [])),
        workSubmissions[] { status }
      }
    }`,
    { today },
  )

  const bundles = new Map<string, SprintStatusEmailBundle>()

  for (const sprint of sprints ?? []) {
    if (!isSprintWeekStarted(sprint.weekStart, now)) continue

    const acceptedTasks = (sprint.tasks ?? []).filter(Boolean)
    if (acceptedTasks.length === 0) continue

    const statusRows = acceptedTasks.map(task =>
      buildStatusRow(task, sprint.weekStart, now),
    )

    const appendRows = (
      role: SprintAtRiskRecipientRole,
      recipientId: string | undefined,
      recipientEmail: string | undefined,
      recipientName: string | undefined,
      rows: SprintStatusEmailRow[],
    ) => {
      if (!recipientId || !recipientEmail || rows.length === 0) return

      const key = bundleKey(role, recipientId, sprint._id)
      const existing = bundles.get(key)
      const bundle =
        existing ??
        ({
          recipientId,
          recipientEmail: recipientEmail.trim().toLowerCase(),
          recipientName: recipientName?.trim() || role,
          recipientRole: role,
          sprintId: sprint._id,
          weekLabel: sprint.weekLabel,
          weekStart: sprint.weekStart,
          weekEnd: sprint.weekEnd,
          sectionName: sprint.sectionName,
          rows: [],
          summary: {
            total: 0,
            done: 0,
            inReview: 0,
            inProgress: 0,
            toDo: 0,
          },
        } satisfies SprintStatusEmailBundle)

      bundle.rows.push(...rows)
      bundles.set(key, bundle)
    }

    appendRows(
      'manager',
      sprint.managerId,
      sprint.managerEmail,
      sprint.managerName,
      statusRows,
    )

    appendRows(
      'supervisor',
      sprint.supervisorId,
      sprint.supervisorEmail,
      sprint.supervisorName,
      statusRows,
    )

    for (const task of acceptedTasks) {
      if (!task.assigneeId || !task.assigneeEmail) continue
      appendRows(
        'officer',
        task.assigneeId,
        task.assigneeEmail,
        task.assigneeName,
        [buildStatusRow(task, sprint.weekStart, now)],
      )
    }
  }

  return [...bundles.values()]
    .map(finalizeBundle)
    .filter(bundle => bundle.rows.length > 0)
}
