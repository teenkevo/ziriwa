'use client'

import * as React from 'react'
import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { getSprintActivityCategoryLabel } from '@/lib/sprint-task-validation'
import type {
  SprintTask,
  WeeklySprint,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type SprintTasksPdfProps = {
  sectionName: string
  sprint: WeeklySprint
}

type PlanReportRow = {
  initiative: string
  measurableActivity: string
  task: SprintTask
}

type ActivityPlanGroup = {
  measurableActivity: string
  rows: PlanReportRow[]
}

type InitiativePlanGroup = {
  initiative: string
  activities: ActivityPlanGroup[]
}

const PLAN_STATUS_LABELS: Record<SprintTask['status'], string> = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  revisions_requested: 'Revisions requested',
}

const SPRINT_STATUS_LABELS: Record<WeeklySprint['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted for review',
  reviewed: 'Review complete',
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  eyebrow: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaBox: {
    flexGrow: 1,
    flexBasis: 0,
    border: '1 solid #e5e7eb',
    borderRadius: 6,
    padding: 8,
  },
  metaLabel: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  table: {
    border: '1 solid #d1d5db',
    borderBottomWidth: 0,
  },
  groupedRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
    minHeight: 36,
  },
  groupedInitiativeCell: {
    width: '23%',
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.2,
  },
  groupedActivityWrapper: {
    width: '77%',
  },
  groupedActivityRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  groupedActivityRowDivider: {
    borderTop: '1 solid #d1d5db',
  },
  groupedActivityCell: {
    width: '40%',
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.2,
  },
  groupedTaskWrapper: {
    width: '60%',
  },
  groupedTaskRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  groupedTaskRowDivider: {
    borderTop: '1 solid #d1d5db',
  },
  groupedTaskCell: {
    width: '100%',
    padding: 6,
    lineHeight: 1.2,
  },
  headerRow: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
    minHeight: 28,
  },
  headerCell: {
    padding: 6,
    borderRight: '1 solid #d1d5db',
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#374151',
  },
  headerInitiative: { width: '23%' },
  headerActivity: { width: '31%' },
  headerTask: { width: '46%', borderRightWidth: 0 },
  taskBlock: {
    marginBottom: 4,
    lineHeight: 1.2,
    fontSize: 9,
  },
  taskBlockLast: {
    marginBottom: 0,
    lineHeight: 1.2,
  },
  taskDescription: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  taskMetaLine: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.8,
  },
  taskMetaLineLabel: {
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1.8,
    marginBottom: 10,
    color: 'black',
  },
  taskFeedbackLine: {
    fontSize: 8,
    color: '#c2410c',
    lineHeight: 1.2,
  },
  empty: {
    padding: 14,
    color: '#6b7280',
    borderBottom: '1 solid #d1d5db',
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#6b7280',
    fontSize: 8,
  },
})

function formatDate(date?: string) {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildPlanRows(sprint: WeeklySprint): PlanReportRow[] {
  return (sprint.tasks ?? []).map(task => ({
    initiative: task.initiativeTitle || 'Unassigned initiative',
    measurableActivity: task.activityTitle || 'Unassigned measurable activity',
    task,
  }))
}

function buildPlanGroups(rows: PlanReportRow[]): InitiativePlanGroup[] {
  return rows.reduce<InitiativePlanGroup[]>((initiativeGroups, row) => {
    let initiativeGroup = initiativeGroups.find(
      group => group.initiative === row.initiative,
    )

    if (!initiativeGroup) {
      initiativeGroup = { initiative: row.initiative, activities: [] }
      initiativeGroups.push(initiativeGroup)
    }

    let activityGroup = initiativeGroup.activities.find(
      group => group.measurableActivity === row.measurableActivity,
    )

    if (!activityGroup) {
      activityGroup = { measurableActivity: row.measurableActivity, rows: [] }
      initiativeGroup.activities.push(activityGroup)
    }

    activityGroup.rows.push(row)
    return initiativeGroups
  }, [])
}

function summarizeTasks(tasks: SprintTask[]) {
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    accepted: tasks.filter(t => t.status === 'accepted').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
    revisionsRequested: tasks.filter(t => t.status === 'revisions_requested')
      .length,
  }
}

function SprintTaskPlanBlock({
  task,
  isLast = true,
}: {
  task: SprintTask
  isLast?: boolean
}) {
  const categoryLabel = getSprintActivityCategoryLabel(task.activityCategory)

  return (
    <View style={isLast ? styles.taskBlockLast : styles.taskBlock}>
      <Text style={styles.taskMetaLine}>
        <Text style={styles.taskMetaLineLabel}>Plan status:</Text>{' '}
        {PLAN_STATUS_LABELS[task.status] ?? task.status}
      </Text>
      <Text style={styles.taskDescription}>{task.description || '—'}</Text>
      {categoryLabel ? (
        <Text style={styles.taskMetaLine}>
          <Text style={styles.taskMetaLineLabel}>Category:</Text>{' '}
          {categoryLabel}
        </Text>
      ) : null}
      {task.contractTaskTitle ? (
        <Text style={styles.taskMetaLine}>
          <Text style={styles.taskMetaLineLabel}>Detailed task:</Text>{' '}
          {task.contractTaskTitle}
        </Text>
      ) : null}
      {task.assigneeName ? (
        <Text style={styles.taskMetaLine}>
          <Text style={styles.taskMetaLineLabel}>Assignee:</Text>{' '}
          {task.assigneeName}
        </Text>
      ) : null}
      {task.revisionReason?.trim() ? (
        <Text style={styles.taskFeedbackLine}>
          <Text style={styles.taskMetaLineLabel}>Manager feedback:</Text>{' '}
          {task.revisionReason.trim()}
        </Text>
      ) : null}
    </View>
  )
}

export function SprintTasksReportPage({
  sectionName,
  sprint,
}: SprintTasksPdfProps) {
  const tasks = sprint.tasks ?? []
  const rows = buildPlanRows(sprint)
  const groups = buildPlanGroups(rows)
  const summary = summarizeTasks(tasks)

  return (
    <Page size='A4' orientation='landscape' style={styles.page}>
      <Text style={styles.eyebrow}>Sprint tasks report</Text>
      <Text style={styles.title}>{sectionName}</Text>
      <Text style={styles.subtitle}>{sprint.weekLabel}</Text>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Supervisor</Text>
          <Text style={styles.metaValue}>
            {sprint.supervisor?.fullName ?? '—'}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Week period</Text>
          <Text style={styles.metaValue}>
            {formatDate(sprint.weekStart)} – {formatDate(sprint.weekEnd)}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Sprint status</Text>
          <Text style={styles.metaValue}>
            {SPRINT_STATUS_LABELS[sprint.status] ?? sprint.status}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Tasks</Text>
          <Text style={styles.metaValue}>
            {summary.total} total · {summary.accepted} accepted ·{' '}
            {summary.pending} pending
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow} fixed>
          <Text style={[styles.headerCell, styles.headerInitiative]}>
            Initiative
          </Text>
          <Text style={[styles.headerCell, styles.headerActivity]}>
            Measurable activity
          </Text>
          <Text style={[styles.headerCell, styles.headerTask]}>
            Sprint task
          </Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>No sprint tasks were found.</Text>
        ) : (
          groups.map(group => (
            <View key={group.initiative} style={styles.groupedRow}>
              <Text style={styles.groupedInitiativeCell}>
                {group.initiative}
              </Text>

              <View style={styles.groupedActivityWrapper}>
                {group.activities.map((activity, activityIndex) => (
                  <View
                    key={`${group.initiative}-${activity.measurableActivity}`}
                    style={[
                      styles.groupedActivityRow,
                      activityIndex > 0 ? styles.groupedActivityRowDivider : {},
                    ]}
                  >
                    <Text style={styles.groupedActivityCell}>
                      {activity.measurableActivity}
                    </Text>

                    <View style={styles.groupedTaskWrapper}>
                      {activity.rows.map((row, taskIndex) => (
                        <View
                          key={`${row.task._key}-${taskIndex}`}
                          style={[
                            styles.groupedTaskRow,
                            taskIndex > 0 ? styles.groupedTaskRowDivider : {},
                          ]}
                        >
                          <View style={styles.groupedTaskCell}>
                            <SprintTaskPlanBlock
                              task={row.task}
                              isLast={taskIndex === activity.rows.length - 1}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.footer} fixed>
        <Text>Generated from sprint plan data</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  )
}

function SprintTasksPdf({ sectionName, sprint }: SprintTasksPdfProps) {
  return (
    <Document
      title={`${sectionName} ${sprint.weekLabel} Sprint Tasks`}
      author='Ziriwa'
      subject='Sprint tasks report'
    >
      <SprintTasksReportPage sectionName={sectionName} sprint={sprint} />
    </Document>
  )
}

export type SprintTasksDownloadButtonProps = SprintTasksPdfProps & {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  className?: string
}

export function SprintTasksDownloadButton({
  sectionName,
  sprint,
  variant = 'outline',
  size = 'sm',
  className,
}: SprintTasksDownloadButtonProps) {
  const fileName = `${slugify(sectionName)}-${slugify(sprint.weekLabel)}-sprint-tasks.pdf`

  return (
    <PDFDownloadLink
      document={<SprintTasksPdf sectionName={sectionName} sprint={sprint} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button
          type='button'
          variant={variant}
          size={size}
          disabled={loading}
          className={className}
        >
          {loading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : size === 'icon' ? (
            <FileDown className='h-4 w-4' />
          ) : (
            <>
              <Image
                src='/folder-icon2.png'
                alt=''
                width={16}
                height={16}
                className='mr-1.5 h-4 w-4'
              />
              Export PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
