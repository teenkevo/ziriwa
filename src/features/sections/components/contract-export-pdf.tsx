'use client'

import * as React from 'react'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'

import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import type { ContractExportDownloadButtonProps } from './contract-export-download-button'

type ContractExportActivityRow = {
  activityType?: 'kpi' | 'cross-cutting' | 'measurable'
  measurableActivity: string
  expectedCompletionDate: string
  target: string
  aim: string
  detailedTasks: string[]
  responsibilityCenter: string
}

type ContractExportInitiativeGroup = {
  initiative: string
  activities: ContractExportActivityRow[]
}

type ContractExportObjectiveGroup = {
  objective: string
  initiatives: ContractExportInitiativeGroup[]
}

type DetailedTaskLike = { task?: string } | string

/** Column weights shared by header and body so borders align top-to-bottom. */
const TABLE_LAYOUT = {
  objective: 17,
  initiative: 15,
  activityArea: 68,
} as const

const ACTIVITY_COLUMN_FLEX = {
  measurable: 23,
  expectedDate: 12,
  target: 8,
  evidence: 15,
  responsibility: 12,
} as const

const RIGHT_SECTION_WIDTH = TABLE_LAYOUT.initiative + TABLE_LAYOUT.activityArea

function toPercent(value: number, total: number) {
  return `${(value / total) * 100}%`
}

const COLUMN_WIDTHS = {
  objective: toPercent(TABLE_LAYOUT.objective, 100),
  rightSection: toPercent(RIGHT_SECTION_WIDTH, 100),
  initiativeInRightSection: toPercent(
    TABLE_LAYOUT.initiative,
    RIGHT_SECTION_WIDTH,
  ),
  activityInRightSection: toPercent(
    TABLE_LAYOUT.activityArea,
    RIGHT_SECTION_WIDTH,
  ),
} as const

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 40,
    paddingLeft: 20,
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
  objectiveGroupRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #d1d5db',
    minHeight: 14,
  },
  mergedObjectiveCell: {
    width: COLUMN_WIDTHS.objective,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.8,
    fontSize: 9,
  },
  objectiveBody: {
    width: COLUMN_WIDTHS.rightSection,
    flexDirection: 'column',
  },
  initiativeGroupRow: {
    flexDirection: 'row',
    minHeight: 14,
  },
  initiativeGroupDivider: {
    borderTop: '1 solid #d1d5db',
  },
  mergedInitiativeCell: {
    width: COLUMN_WIDTHS.initiativeInRightSection,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1.8,
    fontSize: 9,
  },
  activityColumn: {
    width: COLUMN_WIDTHS.activityInRightSection,
    flexDirection: 'column',
  },
  activityDataRow: {
    flexDirection: 'row',
    minHeight: 14,
    width: '100%',
  },
  activityDataRowDivider: {
    borderTop: '1 solid #d1d5db',
  },
  activityMeasurableCell: {
    flex: ACTIVITY_COLUMN_FLEX.measurable,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1,
  },
  activityExpectedDateCell: {
    flex: ACTIVITY_COLUMN_FLEX.expectedDate,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1,
  },
  activityTargetCell: {
    flex: ACTIVITY_COLUMN_FLEX.target,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1,
  },
  activityEvidenceCell: {
    flex: ACTIVITY_COLUMN_FLEX.evidence,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRight: '1 solid #d1d5db',
    lineHeight: 1,
  },
  activityResponsibilityCell: {
    flex: ACTIVITY_COLUMN_FLEX.responsibility,
    paddingVertical: 6,
    paddingHorizontal: 4,
    lineHeight: 1,
    fontSize: 9,
  },
  headerRow: {
    backgroundColor: '#f3f4f6',
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
  headerActivityRow: {
    flexDirection: 'row',
    minHeight: 14,
    width: '100%',
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

function buildObjectiveGroups(
  objectives: SsmartaObjective[] | undefined,
  responsibilityCenter: string,
): ContractExportObjectiveGroup[] {
  const groups: ContractExportObjectiveGroup[] = []

  for (const objective of objectives ?? []) {
    const objectiveLabel =
      `${objective.code ? `${objective.code} ` : ''}${objective.title}`.trim()
    const initiativeGroups: ContractExportInitiativeGroup[] = []

    for (const initiative of objective.initiatives ?? []) {
      const initiativeLabel =
        `${initiative.code ? `${initiative.code} ` : ''}${initiative.title}`.trim()
      const activities: ContractExportActivityRow[] = []

      for (const activity of initiative.measurableActivities ?? []) {
        activities.push({
          activityType: activity.activityType,
          measurableActivity: activity.title || '—',
          // Kept intentionally empty for now as requested.
          expectedCompletionDate: '',
          target: '',
          aim: activity.aim || '',
          detailedTasks: normalizeDetailedTasks(
            activity.tasks as DetailedTaskLike[] | undefined,
          ),
          responsibilityCenter,
        })
      }

      if (activities.length === 0) continue

      initiativeGroups.push({
        initiative: initiativeLabel || '—',
        activities,
      })
    }

    if (initiativeGroups.length === 0) continue

    groups.push({
      objective: objectiveLabel || '—',
      initiatives: initiativeGroups,
    })
  }

  return groups
}

function countActivityRows(groups: ContractExportObjectiveGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total +
      group.initiatives.reduce(
        (initiativeTotal, initiative) =>
          initiativeTotal + initiative.activities.length,
        0,
      ),
    0,
  )
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

function renderMeasurableActivityCell(row: ContractExportActivityRow) {
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

function renderActivityDataRow(
  activity: ContractExportActivityRow,
  activityIndex: number,
  rowKey: string,
) {
  return (
    <View
      key={rowKey}
      style={[
        styles.activityDataRow,
        activityIndex > 0 ? styles.activityDataRowDivider : {},
      ]}
    >
      <View style={styles.activityMeasurableCell}>
        {renderMeasurableActivityCell(activity)}
      </View>
      <View style={styles.activityExpectedDateCell}>
        <Text>{activity.expectedCompletionDate}</Text>
      </View>
      <View style={styles.activityTargetCell}>
        <Text style={styles.mutedCellText}>{activity.target}</Text>
      </View>
      <View style={styles.activityEvidenceCell}>
        <Text>{''}</Text>
      </View>
      <View style={styles.activityResponsibilityCell}>
        <Text style={styles.primaryCellText}>
          {activity.responsibilityCenter}
        </Text>
      </View>
    </View>
  )
}

function ContractExportPdf({
  sectionName,
  financialYearLabel,
  objectives,
  responsibilityCenter,
}: ContractExportDownloadButtonProps) {
  const objectiveGroups = buildObjectiveGroups(objectives, responsibilityCenter)
  const activityRowCount = countActivityRows(objectiveGroups)

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
          <View style={[styles.objectiveGroupRow, styles.headerRow]} fixed>
            <Text style={[styles.mergedObjectiveCell, styles.headerCell]}>
              SSMARTA objective
            </Text>

            <View style={styles.objectiveBody}>
              <View style={styles.initiativeGroupRow}>
                <Text style={[styles.mergedInitiativeCell, styles.headerCell]}>
                  Initiative
                </Text>

                <View style={styles.activityColumn}>
                  <View style={styles.headerActivityRow}>
                    <View style={styles.activityMeasurableCell}>
                      <Text style={styles.headerCell}>
                        Measurable activities
                      </Text>
                    </View>
                    <View style={styles.activityExpectedDateCell}>
                      <Text style={styles.headerCell}>Completion Date</Text>
                    </View>
                    <View style={styles.activityTargetCell}>
                      <Text style={styles.headerCell}>Target</Text>
                    </View>
                    <View style={styles.activityEvidenceCell}>
                      <Text style={styles.headerCell}>Output</Text>
                    </View>
                    <View
                      style={[
                        styles.activityResponsibilityCell,
                        styles.lastCell,
                      ]}
                    >
                      <Text style={styles.headerCell}>Responsibility</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {activityRowCount === 0 ? (
            <Text style={styles.empty}>
              No measurable activities found on this contract.
            </Text>
          ) : (
            objectiveGroups.map((objectiveGroup, objectiveIndex) => (
              <View
                key={`${objectiveGroup.objective}-${objectiveIndex}`}
                style={styles.objectiveGroupRow}
              >
                <View style={styles.mergedObjectiveCell}>
                  <Text>{objectiveGroup.objective}</Text>
                </View>

                <View style={styles.objectiveBody}>
                  {objectiveGroup.initiatives.map(
                    (initiativeGroup, initiativeIndex) => (
                      <View
                        key={`${objectiveGroup.objective}-${initiativeGroup.initiative}-${initiativeIndex}`}
                        style={[
                          styles.initiativeGroupRow,
                          initiativeIndex > 0
                            ? styles.initiativeGroupDivider
                            : {},
                        ]}
                      >
                        <View style={styles.mergedInitiativeCell}>
                          <Text>{initiativeGroup.initiative}</Text>
                        </View>

                        <View style={styles.activityColumn}>
                          {initiativeGroup.activities.map(
                            (activity, activityIndex) =>
                              renderActivityDataRow(
                                activity,
                                activityIndex,
                                `${initiativeGroup.initiative}-${activity.measurableActivity}-${activityIndex}`,
                              ),
                          )}
                        </View>
                      </View>
                    ),
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Auto-generated from contract data</Text>
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

export async function generateContractExportPdfBlob(
  props: ContractExportDownloadButtonProps,
) {
  return pdf(<ContractExportPdf {...props} />).toBlob()
}
