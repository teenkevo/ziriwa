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

import { Button } from '@/components/ui/button'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'

interface ContractExportDownloadButtonProps {
  sectionName: string
  financialYearLabel?: string
  objectives?: SsmartaObjective[]
  responsibilityCenter: string
}

type ContractExportRow = {
  objective: string
  initiative: string
  activityType?: 'kpi' | 'cross-cutting' | 'measurable'
  measurableActivity: string
  expectedCompletionDate: string
  target: string
  aim: string
  detailedTasks: string[]
  responsibilityCenter: string
  firstInObjective: boolean
  firstInInitiative: boolean
}

type DetailedTaskLike = { task?: string } | string

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  eyebrow: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 8,
  },
  table: {
    border: '1 solid #d1d5db',
    borderBottomWidth: 0,
  },
  row: {
    fontSize: 9,
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
    minHeight: 14,
  },
  objectiveBandRow: {
    backgroundColor: '#f9fafb',
  },
  headerRow: {
    backgroundColor: '#f3f4f6',
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1,
  },
  mutedCellText: {
    color: '#6b7280',
  },
  primaryCellText: {
    fontWeight: 700,
    color: '#111827',
  },
  measurableBlockLabel: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  measurableBlockValue: {
    fontSize: 9,
    marginBottom: 0.4,
  },
  measurableTaskBullet: {
    fontSize: 9,
    marginBottom: 0.2,
    marginTop: 6,
  },
  measurableTaskBulletMarker: {
    fontSize: 9,
    marginBottom: 0.2,
    marginTop: 6,
    fontWeight: 700,
    marginRight: 6,
  },
  plainActivityText: {
    fontSize: 9,
    lineHeight: 1.8,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#374151',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  objectiveCell: {
    width: '17%',
  },
  initiativeCell: {
    width: '15%',
  },
  measurableActivityCell: {
    width: '23%',
  },
  expectedDateCell: {
    width: '12%',
  },
  targetCell: {
    width: '8%',
  },
  evidenceCell: {
    width: '15%',
  },
  responsibilityCell: {
    width: '12%',
  },
  empty: {
    padding: 12,
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#6b7280',
    fontSize: 8,
  },
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildRows(
  objectives: SsmartaObjective[] | undefined,
  responsibilityCenter: string,
): ContractExportRow[] {
  const rows: ContractExportRow[] = []
  for (const objective of objectives ?? []) {
    const objectiveLabel =
      `${objective.code ? `${objective.code} ` : ''}${objective.title}`.trim()
    let hasObjectiveRow = false
    for (const initiative of objective.initiatives ?? []) {
      const initiativeLabel =
        `${initiative.code ? `${initiative.code} ` : ''}${initiative.title}`.trim()
      let hasInitiativeRow = false
      for (const activity of initiative.measurableActivities ?? []) {
        const detailedTasks = normalizeDetailedTasks(
          activity.tasks as DetailedTaskLike[] | undefined,
        )
        rows.push({
          objective: objectiveLabel || '—',
          initiative: initiativeLabel || '—',
          activityType: activity.activityType,
          measurableActivity: activity.title || '—',
          // Kept intentionally empty for now as requested.
          expectedCompletionDate: '',
          target: '',
          aim: activity.aim || '',
          detailedTasks,
          responsibilityCenter,
          firstInObjective: !hasObjectiveRow,
          firstInInitiative: !hasInitiativeRow,
        })
        hasObjectiveRow = true
        hasInitiativeRow = true
      }
    }
  }

  return rows
}

function formatDetailedTaskMarker(index: number): string {
  const letter = String.fromCharCode(97 + index)
  return `${letter})`
}

function normalizeDetailedTasks(
  tasks: DetailedTaskLike[] | undefined,
): string[] {
  if (!tasks?.length) return []
  return tasks
    .map(task => {
      if (typeof task === 'string') return task.trim()
      if (task && typeof task.task === 'string') return task.task.trim()
      return ''
    })
    .filter(Boolean)
}

function renderMeasurableActivityCell(row: ContractExportRow) {
  if (row.activityType !== 'kpi') {
    return (
      <Text style={styles.plainActivityText}>
        {row.measurableActivity || '—'}
      </Text>
    )
  }

  return (
    <View>
      <Text style={styles.measurableBlockLabel}>NUMBERED KPI</Text>
      <Text style={styles.measurableBlockValue}>
        {row.measurableActivity || '—'}
      </Text>

      <Text style={styles.measurableBlockLabel}>AIM</Text>
      <Text style={styles.measurableBlockValue}>{row.aim || '—'}</Text>

      <Text style={styles.measurableBlockLabel}>Detailed Tasks</Text>
      {row.detailedTasks.length > 0 ? (
        row.detailedTasks.map((task, index) => (
          <Text key={`${task}-${index}`} style={styles.measurableTaskBullet}>
            <Text style={styles.measurableTaskBulletMarker}>
              {formatDetailedTaskMarker(index)}
            </Text>{' '}
            <Text key={`${task}-${index}`} style={styles.measurableTaskBullet}>
              {task}
            </Text>
          </Text>
        ))
      ) : (
        <Text style={styles.measurableTaskBullet}>a) —</Text>
      )}
    </View>
  )
}

function ContractExportPdf({
  sectionName,
  financialYearLabel,
  objectives,
  responsibilityCenter,
}: ContractExportDownloadButtonProps) {
  const rows = buildRows(objectives, responsibilityCenter)

  return (
    <Document
      title={`${sectionName} Contract Export`}
      author='Ziriwa'
      subject='Contract export'
    >
      <Page size='A4' orientation='landscape' style={styles.page}>
        <Text style={styles.eyebrow}>Contract export</Text>
        <Text style={styles.title}>{sectionName}</Text>
        <Text style={styles.subtitle}>
          {financialYearLabel ? `Financial year: ${financialYearLabel}` : '—'}
        </Text>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            <Text
              style={[styles.cell, styles.headerCell, styles.objectiveCell]}
            >
              SSMARTA objective
            </Text>
            <Text
              style={[styles.cell, styles.headerCell, styles.initiativeCell]}
            >
              Initiative
            </Text>
            <Text
              style={[
                styles.cell,
                styles.headerCell,
                styles.measurableActivityCell,
              ]}
            >
              Measurable activities
            </Text>
            <Text
              style={[styles.cell, styles.headerCell, styles.expectedDateCell]}
            >
              Completion Date
            </Text>
            <Text style={[styles.cell, styles.headerCell, styles.targetCell]}>
              Target
            </Text>
            <Text style={[styles.cell, styles.headerCell, styles.evidenceCell]}>
              Output
            </Text>
            <Text
              style={[
                styles.cell,
                styles.headerCell,
                styles.responsibilityCell,
                styles.lastCell,
              ]}
            >
              Responsibility
            </Text>
          </View>

          {rows.length === 0 ? (
            <Text style={styles.empty}>
              No measurable activities found on this contract.
            </Text>
          ) : (
            rows.map((row, index) => (
              <View
                key={`${row.initiative}-${row.measurableActivity}-${index}`}
                style={[
                  styles.row,
                  row.firstInObjective ? styles.objectiveBandRow : {},
                ]}
              >
                <Text style={[styles.cell, styles.objectiveCell]}>
                  {row.firstInObjective ? row.objective : ''}
                </Text>
                <Text style={[styles.cell, styles.initiativeCell]}>
                  {row.firstInInitiative ? row.initiative : ''}
                </Text>
                <View style={[styles.cell, styles.measurableActivityCell]}>
                  {renderMeasurableActivityCell(row)}
                </View>
                <Text style={[styles.cell, styles.expectedDateCell]}>
                  {row.expectedCompletionDate}
                </Text>
                <Text
                  style={[styles.cell, styles.targetCell, styles.mutedCellText]}
                >
                  {row.target}
                </Text>
                <Text style={[styles.cell, styles.evidenceCell]}>{''}</Text>
                <Text
                  style={[
                    styles.cell,
                    styles.responsibilityCell,
                    styles.primaryCellText,
                    styles.lastCell,
                  ]}
                >
                  {row.responsibilityCenter}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Generated from contract data</Text>
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

export function ContractExportDownloadButton(
  props: ContractExportDownloadButtonProps,
) {
  const fileName = `${slugify(props.sectionName)}-${slugify(props.financialYearLabel ?? 'contract')}-contract-export.pdf`

  return (
    <PDFDownloadLink
      document={<ContractExportPdf {...props} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant='outline' size='sm' disabled={loading}>
          {loading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <FileDown className='mr-2 h-4 w-4' />
          )}
          {loading ? 'Preparing Export…' : 'Export Contract'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
