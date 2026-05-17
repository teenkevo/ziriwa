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
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  SprintTask,
  WeeklySprint,
  WorkSubmission,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type WeeklyReportPdfProps = {
  sectionName: string
  sprint: WeeklySprint
}

type ReportRow = {
  initiative: string
  measurableActivity: string
  tasksDone: string
  evidenceItems: string
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
  headerRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    padding: 6,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.35,
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

function getTaskDoneLabel(task: SprintTask) {
  const assignee = task.assigneeName ? `Assigned to ${task.assigneeName}. ` : ''
  const status = task.taskStatus
    ? `Task status: ${task.taskStatus.replace(/_/g, ' ')}. `
    : ''
  return `${assignee}${status}${task.description || '—'}`.trim()
}

function getSubmissionLabel(submission: WorkSubmission, index: number) {
  const parts = [
    `${index + 1}. ${submission.description || 'Work submission'}`,
    submission.status ? `Status: ${submission.status}` : undefined,
    submission.date ? `Date: ${formatDate(submission.date)}` : undefined,
    submission.output?.asset?.originalFilename
      ? `Evidence: ${submission.output.asset.originalFilename}`
      : submission.output?.asset?.url
        ? 'Evidence file attached'
        : undefined,
  ].filter(Boolean)

  return parts.join(' | ')
}

function buildRows(sprint: WeeklySprint): ReportRow[] {
  return (sprint.tasks ?? [])
    .filter(task => {
      const hasDoneStatus =
        task.taskStatus === 'delivered' || task.taskStatus === 'done'
      const hasSubmission = (task.workSubmissions ?? []).length > 0
      return task.status === 'accepted' || hasDoneStatus || hasSubmission
    })
    .map(task => ({
      initiative: task.initiativeTitle || 'Unassigned initiative',
      measurableActivity:
        task.activityTitle || 'Unassigned measurable activity',
      tasksDone: getTaskDoneLabel(task),
      evidenceItems:
        (task.workSubmissions ?? []).map(getSubmissionLabel).join('\n') ||
        'No work submissions or evidence attached',
    }))
}

function WeeklyReportPdf({ sectionName, sprint }: WeeklyReportPdfProps) {
  const rows = buildRows(sprint)

  return (
    <Document
      title={`${sectionName} ${sprint.weekLabel} Weekly Report`}
      author='Ziriwa'
      subject='Weekly sprint report'
    >
      <Page size='A4' orientation='landscape' style={styles.page}>
        <Text style={styles.eyebrow}>Weekly sprint report</Text>
        <Text style={styles.title}>{sectionName}</Text>
        <Text style={styles.subtitle}>{sprint.weekLabel}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Week period</Text>
            <Text style={styles.metaValue}>
              {formatDate(sprint.weekStart)} – {formatDate(sprint.weekEnd)}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Sprint status</Text>
            <Text style={styles.metaValue}>{sprint.status}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Supervisor</Text>
            <Text style={styles.metaValue}>
              {sprint.supervisor?.fullName ?? '—'}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Report rows</Text>
            <Text style={styles.metaValue}>{rows.length}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            <Text
              style={[styles.cell, styles.headerCell, styles.initiativeCell]}
            >
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
              No accepted, delivered, done, or submitted tasks were found for
              this sprint.
            </Text>
          ) : (
            rows.map((row, index) => (
              <View key={`${row.initiative}-${index}`} style={styles.row}>
                <Text style={[styles.cell, styles.initiativeCell]}>
                  {row.initiative}
                </Text>
                <Text style={[styles.cell, styles.activityCell]}>
                  {row.measurableActivity}
                </Text>
                <Text style={[styles.cell, styles.taskCell]}>
                  {row.tasksDone}
                </Text>
                <Text
                  style={[styles.cell, styles.evidenceCell, styles.lastCell]}
                >
                  {row.evidenceItems}
                </Text>
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

export function WeeklyReportDownloadButton({
  sectionName,
  sprint,
}: WeeklyReportDownloadButtonProps) {
  const fileName = `${slugify(sectionName)}-${slugify(sprint.weekLabel)}-weekly-report.pdf`

  return (
    <PDFDownloadLink
      document={<WeeklyReportPdf sectionName={sectionName} sprint={sprint} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button disabled={loading}>
          {loading ? (
            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
          ) : (
            <FileText className='h-4 w-4 mr-2' />
          )}
          {loading ? 'Preparing PDF…' : 'Generate PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
