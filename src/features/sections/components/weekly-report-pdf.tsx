'use client'

import * as React from 'react'
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  getSprintTaskStatusLabel,
  resolveSprintTaskStatus,
} from '@/lib/sprint-task-status'
import { getRichTextPlainText } from '@/lib/rich-text'
import type {
  SprintTask,
  WeeklySprint,
  WorkSubmission,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import Image from 'next/image'

type WeeklyReportPdfProps = {
  sectionName: string
  sprint: WeeklySprint
}

type ReportRow = {
  initiative: string
  measurableActivity: string
  task: SprintTask
}

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review by supervisor',
  approved: 'Approved by Supervisor',
  rejected: 'Rejected by Supervisor',
}

type ActivityReportGroup = {
  measurableActivity: string
  rows: ReportRow[]
}

type InitiativeReportGroup = {
  initiative: string
  activities: ActivityReportGroup[]
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
  row: {
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
    minHeight: 36,
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
    lineHeight: 0.8,
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
    width: '28.571428%',
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 0.8,
  },
  groupedTaskWrapper: {
    width: '71.428572%',
  },
  groupedTaskRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  groupedTaskRowDivider: {
    borderTop: '1 solid #d1d5db',
  },
  groupedTaskCell: {
    width: '54.545455%',
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.35,
  },
  groupedEvidenceCell: {
    width: '45.454545%',
    padding: 6,
    lineHeight: 1.35,
  },
  taskBlock: {
    marginBottom: 6,
    lineHeight: 1.5,
  },
  taskBlockLast: {
    marginBottom: 0,
    lineHeight: 1.5,
  },
  taskDescription: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  taskMetaLine: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 1,
    lineHeight: 1.4,
  },
  submissionBlock: {
    marginBottom: 6,
    paddingBottom: 8,
    borderBottom: '1 solid #e5e7eb',
  },
  submissionBlockLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  submissionHeading: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
  },
  submissionNarrative: {
    fontSize: 8,
    color: '#111827',
    marginBottom: 10,
    lineHeight: 1.8,
  },
  submissionLine: {
    fontSize: 8,
    color: '#111827',
    marginBottom: 1,
    lineHeight: 1.8,
  },
  submissionMetaLine: {
    fontWeight: 700,
  },
  submissionMuted: {
    fontSize: 8,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 0.8,
  },
  evidenceLink: {
    fontSize: 8,
    color: '#1d4ed8',
    textDecoration: 'underline',
    lineHeight: 2,
  },
  submissionStatusPending: {
    color: '#c2410c',
    fontWeight: 700,
  },
  submissionStatusApproved: {
    color: '#047857',
    fontWeight: 700,
  },
  submissionStatusRejected: {
    color: '#b91c1c',
    fontWeight: 700,
  },
  headerRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 0.8,
  },
  lastCell: {
    borderRightWidth: 0,
  },
  headerCell: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#374151',
  },
  initiativeCell: {
    width: '23%',
  },
  activityCell: {
    width: '22%',
  },
  taskCell: {
    width: '30%',
  },
  taskMetaLineLabel: {
    fontSize: 8,
    fontWeight: 700,
    lineHeight: 1.5,
    color: '#374151',
  },
  evidenceCell: {
    width: '25%',
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

function formatTaskStatusLabel(task: SprintTask, weekStart: string) {
  return getSprintTaskStatusLabel(resolveSprintTaskStatus(task, weekStart))
}

function formatSubmissionStatusLabel(status?: string) {
  if (!status) return '—'
  return SUBMISSION_STATUS_LABELS[status] ?? status
}

function isValidPdfLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function SubmissionStatusText({ status }: { status?: string }) {
  const resolvedStatus = status ?? 'pending'
  const label = formatSubmissionStatusLabel(resolvedStatus)
  const colorStyle =
    resolvedStatus === 'approved'
      ? styles.submissionStatusApproved
      : resolvedStatus === 'rejected'
        ? styles.submissionStatusRejected
        : styles.submissionStatusPending

  return <Text style={colorStyle}>{label}</Text>
}

function formatSubmittedAt(submission: WorkSubmission): string | null {
  if (submission.submittedAt) {
    const parsed = new Date(submission.submittedAt)
    if (!Number.isNaN(parsed.getTime())) {
      const date = parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const time = parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
      return `${date} ${time}`
    }
  }

  if (!submission.date) return null

  const date = formatDate(submission.date)
  const time = submission.startTime ?? submission.endTime
  return time ? `${date} ${time}` : date
}

function TaskDoneBlock({
  task,
  weekStart,
  isLast = true,
}: {
  task: SprintTask
  weekStart: string
  isLast?: boolean
}) {
  return (
    <View style={isLast ? styles.taskBlockLast : styles.taskBlock}>
      <Text style={styles.taskDescription}>
        {getRichTextPlainText(task.description, '—')}
      </Text>

      {task.assigneeName ? (
        <Text style={styles.taskMetaLine}>
          <Text style={styles.taskMetaLineLabel}>Assigned to:</Text>{' '}
          {task.assigneeName}
        </Text>
      ) : null}
    </View>
  )
}

function WorkSubmissionsBlock({
  submissions,
}: {
  submissions: WorkSubmission[]
}) {
  if (submissions.length === 0) {
    return (
      <Text style={styles.submissionMuted}>
        No work submissions or evidence attached
      </Text>
    )
  }

  return (
    <View>
      {submissions.map((submission, index) => {
        const asset = submission.output?.asset
        const submittedAt = formatSubmittedAt(submission)
        const isLast = index === submissions.length - 1

        return (
          <View
            key={submission._key}
            style={isLast ? styles.submissionBlockLast : styles.submissionBlock}
          >
            <Text style={styles.submissionHeading}>Submission {index + 1}</Text>
            <Text style={styles.submissionNarrative}>
              {submission.description || 'Work submission'}
            </Text>
            <Text style={styles.submissionLine}>
              <Text style={styles.submissionMetaLine}>Status:</Text>{' '}
              <SubmissionStatusText status={submission.status} />
            </Text>
            {submittedAt ? (
              <Text style={styles.submissionLine}>
                <Text style={styles.submissionMetaLine}>Submitted At:</Text>{' '}
                {submittedAt}
              </Text>
            ) : null}
            {asset?.originalFilename ? (
              <Text style={styles.submissionLine}>
                <Text style={styles.submissionMetaLine}>Evidence:</Text>{' '}
                {asset.url && isValidPdfLinkUrl(asset.url) ? (
                  <Link src={asset.url} style={styles.evidenceLink}>
                    {asset.originalFilename}
                  </Link>
                ) : (
                  asset.originalFilename
                )}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

function buildRows(sprint: WeeklySprint): ReportRow[] {
  return (sprint.tasks ?? [])
    .filter(task => {
      const workflowStatus = resolveSprintTaskStatus(task, sprint.weekStart)
      const hasDoneStatus =
        workflowStatus === 'delivered' || workflowStatus === 'done'
      const hasSubmission = (task.workSubmissions ?? []).length > 0
      return task.status === 'accepted' || hasDoneStatus || hasSubmission
    })
    .map(task => ({
      initiative: task.initiativeTitle || 'Unassigned initiative',
      measurableActivity:
        task.activityTitle || 'Unassigned measurable activity',
      task,
    }))
}

function buildGroups(rows: ReportRow[]): InitiativeReportGroup[] {
  return rows.reduce<InitiativeReportGroup[]>((initiativeGroups, row) => {
    let initiativeGroup = initiativeGroups.find(
      group => group.initiative === row.initiative,
    )

    if (!initiativeGroup) {
      initiativeGroup = {
        initiative: row.initiative,
        activities: [],
      }
      initiativeGroups.push(initiativeGroup)
    }

    let activityGroup = initiativeGroup.activities.find(
      group => group.measurableActivity === row.measurableActivity,
    )

    if (!activityGroup) {
      activityGroup = {
        measurableActivity: row.measurableActivity,
        rows: [],
      }
      initiativeGroup.activities.push(activityGroup)
    }

    activityGroup.rows.push(row)
    return initiativeGroups
  }, [])
}

export type DivisionWeeklyReportSection = {
  sectionName: string
  sprint: WeeklySprint
}

export type DivisionWeeklyReportPdfProps = {
  divisionName: string
  weekLabel: string
  sections: DivisionWeeklyReportSection[]
}

export function WeeklyReportPage({
  sectionName,
  sprint,
}: WeeklyReportPdfProps) {
  const rows = buildRows(sprint)
  const groups = buildGroups(rows)

  return (
    <Page size='A4' orientation='landscape' style={styles.page}>
      <Text style={styles.eyebrow}>Weekly sprint report</Text>
      <Text style={styles.title}>{sectionName}</Text>
      <Text style={styles.subtitle}>{sprint.weekLabel}</Text>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Workstream name</Text>
          <Text style={styles.metaValue}>{sprint.workstreamName ?? '—'}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Work stream lead</Text>
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
      </View>

      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]} fixed>
          <Text style={[styles.cell, styles.headerCell, styles.initiativeCell]}>
            Initiative
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.activityCell]}>
            Measurable activity
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.taskCell]}>
            Tasks done
          </Text>
          <Text
            style={[
              styles.cell,
              styles.headerCell,
              styles.evidenceCell,
              styles.lastCell,
            ]}
          >
            Work submissions / evidence items
          </Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>
            No accepted, delivered, done, or submitted tasks were found for this
            sprint.
          </Text>
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
                            <TaskDoneBlock
                              task={row.task}
                              weekStart={sprint.weekStart}
                              isLast={taskIndex === activity.rows.length - 1}
                            />
                          </View>
                          <View style={styles.groupedEvidenceCell}>
                            <WorkSubmissionsBlock
                              submissions={row.task.workSubmissions ?? []}
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
        <Text>Generated from sprint data</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  )
}

function WeeklyReportPdf({ sectionName, sprint }: WeeklyReportPdfProps) {
  return (
    <Document
      title={`${sectionName} ${sprint.weekLabel} Weekly Report`}
      author='Ziriwa'
      subject='Weekly sprint report'
    >
      <WeeklyReportPage sectionName={sectionName} sprint={sprint} />
    </Document>
  )
}

function DivisionWeeklyReportEmptyPage({
  divisionName,
  weekLabel,
}: {
  divisionName: string
  weekLabel: string
}) {
  return (
    <Page size='A4' orientation='landscape' style={styles.page}>
      <Text style={styles.eyebrow}>Weekly sprint report</Text>
      <Text style={styles.title}>{divisionName}</Text>
      <Text style={styles.subtitle}>{weekLabel}</Text>
      <Text style={styles.empty}>
        No current-week sprints were found for this division. This report was
        generated with no section data.
      </Text>
    </Page>
  )
}

export function DivisionWeeklyReportPdf({
  divisionName,
  weekLabel,
  sections,
}: DivisionWeeklyReportPdfProps) {
  return (
    <Document
      title={`${divisionName} ${weekLabel} Weekly Report`}
      author='Ziriwa'
      subject='Division weekly sprint report'
    >
      {sections.length === 0 ? (
        <DivisionWeeklyReportEmptyPage
          divisionName={divisionName}
          weekLabel={weekLabel}
        />
      ) : (
        sections.map(({ sectionName, sprint }) => (
          <WeeklyReportPage
            key={sprint._id}
            sectionName={sectionName}
            sprint={sprint}
          />
        ))
      )}
    </Document>
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

type WeeklyReportDownloadButtonProps = {
  sectionName: string
  sprint: WeeklySprint
}

export function weeklyReportFileName(sectionName: string, weekLabel: string) {
  return `${slugify(sectionName)}-${slugify(weekLabel)}-weekly-report.pdf`
}

export async function generateWeeklyReportBlob(props: WeeklyReportPdfProps) {
  return pdf(<WeeklyReportPdf {...props} />).toBlob()
}

export function WeeklyReportDownloadButton({
  sectionName,
  sprint,
}: WeeklyReportDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)
  const fileName = weeklyReportFileName(sectionName, sprint.weekLabel)

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (isGenerating) return

    setIsGenerating(true)
    try {
      const blob = await generateWeeklyReportBlob({ sectionName, sprint })
      downloadBlob(blob, fileName)
    } catch (error) {
      console.error('Failed to generate weekly report', error)
      toast.error('Could not generate the weekly report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type='button'
      variant='secondary'
      disabled={isGenerating}
      className='border-primary'
      onClick={handleClick}
    >
      {isGenerating ? (
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
      ) : (
        <Image
          src='/folder-icon2.png'
          alt='icon-pdf'
          width={20}
          height={20}
          className='mr-1 h-5 w-5'
        />
      )}
      {isGenerating ? 'Preparing Report…' : 'Generate Report'}
    </Button>
  )
}

export async function generateDivisionWeeklyReportBlob(
  props: DivisionWeeklyReportPdfProps,
) {
  return pdf(<DivisionWeeklyReportPdf {...props} />).toBlob()
}

export function divisionWeeklyReportFileName(
  divisionName: string,
  weekLabel: string,
) {
  return `${slugify(divisionName)}-${slugify(weekLabel)}-division-weekly-report.pdf`
}
