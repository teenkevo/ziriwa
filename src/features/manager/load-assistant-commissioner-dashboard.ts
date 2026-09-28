import 'server-only'

import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import type {
  AtRiskActivity,
  AtRiskPeriodDeliverable,
  AtRiskSprintTask,
  LateEngagement,
  StakeholderActionTrackerItem,
  UpcomingMeasurableActivity,
  UpcomingPeriodDeliverable,
} from '@/lib/section-dashboard-metrics'
import type { WorkContextMode } from '@/lib/section-access'
import {
  resolveAssistantCommissionerWorkspace,
  type AssistantCommissionerWorkspaceContext,
} from '@/lib/assistant-commissioner-workspace.server'
import { client } from '@/sanity/lib/client'
import { getDivisionContractByDivision } from '@/sanity/lib/division-contracts/get-division-contract-by-division'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import { getStakeholderEngagementBySection } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-section'
import {
  computeDivisionMonthlyOversight,
  computeDivisionWeeklyOversight,
} from '@/lib/monthly-oversight'
import type { MonthlyOversightSummary } from '@/lib/monthly-oversight'
import { buildBoardActionsOversightSummary } from '@/lib/board-actions-oversight'
import type { BoardActionsOversightSummary } from '@/lib/board-actions-oversight'
import { buildContractOversightSummary } from '@/lib/contract-oversight'
import type { ContractOversightSummary } from '@/lib/contract-oversight'
import { isCurrentWeekSprint } from '@/lib/sprint-report-readiness'
import { computeSprintVelocitySummary } from '@/lib/sprint-velocity'
import type { SprintVelocitySummary } from '@/lib/sprint-velocity'
import { computeManagerSprintPulse } from '@/lib/sprint-dashboard-pulse'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type AcSection = {
  _id: string
  name: string
  slug?: { current?: string }
  supervisorCount?: number
}

export type AcSectionRef = {
  sectionId: string
  sectionName: string
  sectionSlug?: string
}

export type AcFocusItems = {
  upcomingActivities: (UpcomingMeasurableActivity & AcSectionRef)[]
  upcomingPeriodDeliverables: (UpcomingPeriodDeliverable & AcSectionRef)[]
  overdueActivities: (AtRiskActivity & AcSectionRef)[]
  overduePeriodDeliverables: (AtRiskPeriodDeliverable & AcSectionRef)[]
  pendingReviewTasks: (AtRiskSprintTask & AcSectionRef)[]
  revisionRequestedTasks: (AtRiskSprintTask & AcSectionRef)[]
  lateEngagements: (LateEngagement & AcSectionRef)[]
}

export type AcSectionSprintMetrics = AcSectionRef & {
  weekLabel?: string
  planned: { count: number; max: number }
  inReview: { tasks: number; sprints: number }
  acceptedReady: { count: number; max: number }
  atRisk: number
  done: number
  total: number
}

export type AcActionTrackerItem = StakeholderActionTrackerItem &
  AcSectionRef & {
    /** Person responsible (assignee), surfaced for AC oversight. */
    responsibleLabel: string
  }

export type AssistantCommissionerDashboardData = {
  acWorkspace: AssistantCommissionerWorkspaceContext
  division: {
    _id: string
    name: string
    fullName?: string
    acronym?: string
    slug?: { current?: string }
  }
  sections: AcSection[]
  contractOversight: ContractOversightSummary
  activeSprints: {
    count: number
    done: number
    total: number
    accepted: number
    sectionTotal: number
    sections: {
      sectionId: string
      sectionName: string
      sectionSlug?: string
      weekLabel: string
      done: number
      total: number
      accepted: number
    }[]
  }
  weeklyOversight: MonthlyOversightSummary
  weeklyReport: {
    divisionName: string
    weekLabel: string
    sections: { sectionName: string; sprint: WeeklySprint }[]
  }
  monthlyOversight: MonthlyOversightSummary
  teamVelocity: {
    sections: { id: string; name: string; slug?: string }[]
    bySectionId: Record<string, SprintVelocitySummary>
  }
  boardActionsOversight: BoardActionsOversightSummary
  focusItems: AcFocusItems
  sectionSprintMetrics: AcSectionSprintMetrics[]
  actionTracker: {
    total: number
    overdue: number
    dueSoon: number
    items: AcActionTrackerItem[]
  }
  /** @deprecated Prefer focusItems; kept for commissioner panel compatibility. */
  overdue: {
    stakeholderEngagements: LateEngagement[]
    periodDeliverables: AtRiskPeriodDeliverable[]
    boardActions: {
      _key: string
      title: string
      dueDate: string
      daysOverdue: number
    }[]
    memos: { _key: string; title: string; dueDate: string; daysOverdue: number }[]
  }
}

function tagSection<T extends { _key: string }>(
  items: T[],
  section: AcSection,
): (T & AcSectionRef)[] {
  const sectionSlug = section.slug?.current
  return items.map(item => ({
    ...item,
    sectionId: section._id,
    sectionName: section.name,
    sectionSlug,
  }))
}

export async function loadAssistantCommissionerDashboardData(options?: {
  workContext?: WorkContextMode
}): Promise<AssistantCommissionerDashboardData | null> {
  const acWorkspace = await resolveAssistantCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!acWorkspace) return null

  const { division } = acWorkspace
  if (!division?._id) return null

  const sections = await client.fetch<AcSection[]>(
    /* groq */ `
      *[_type == "section" && division._ref == $divisionId] | order(order asc, name asc) {
        _id,
        name,
        slug,
        "supervisorCount": count(*[_type == "staff" && role == "supervisor" && coalesce(status, "active") != "inactive" && section._ref == ^._id])
      }
    `,
    { divisionId: division._id },
  )

  const today = new Date().toISOString().slice(0, 10)

  const divisionContract = await getDivisionContractByDivision(division._id)
  const sectionResults = await Promise.all(
    sections.map(async section => {
      const [contract, sprints, engagement] = await Promise.all([
        getSectionContractBySection(section._id),
        getSprintsBySection(section._id),
        getStakeholderEngagementBySection(section._id),
      ])
      return {
        section,
        contract,
        sprints,
        engagement,
        metrics: computeSectionDashboardMetrics({
          contract,
          sprints,
          engagement,
          today,
        }),
      }
    }),
  )

  const teamVelocity = {
    sections: sections.map(section => ({
      id: section._id,
      name: section.name,
      slug: section.slug?.current,
    })),
    bySectionId: Object.fromEntries(
      sectionResults.map(result => [
        result.section._id,
        computeSprintVelocitySummary(result.sprints, today, 7),
      ]),
    ),
  }

  const sectionMetrics = sectionResults.map(result => result.metrics)

  const activeSprintSections = sectionResults
    .filter(
      (
        result,
      ): result is typeof result & {
        metrics: {
          activeSprint: NonNullable<(typeof result.metrics)['activeSprint']>
        }
      } => result.metrics.activeSprint != null,
    )
    .map(result => {
      const sprint = result.metrics.activeSprint
      return {
        sectionId: result.section._id,
        sectionName: result.section.name,
        sectionSlug: result.section.slug?.current,
        weekLabel: sprint.weekLabel,
        done: sprint.done,
        total: sprint.total,
        accepted: sprint.accepted,
      }
    })

  const activeSprints = {
    count: activeSprintSections.length,
    done: activeSprintSections.reduce((acc, row) => acc + row.done, 0),
    total: activeSprintSections.reduce((acc, row) => acc + row.total, 0),
    accepted: activeSprintSections.reduce((acc, row) => acc + row.accepted, 0),
    sectionTotal: sections.length,
    sections: activeSprintSections,
  }

  const monthlyOversight = computeDivisionMonthlyOversight(
    sectionResults.map(result => ({
      contract: result.contract,
      sprints: result.sprints,
      engagement: result.engagement,
    })),
    today,
    sections.length,
  )
  const weeklyOversight = computeDivisionWeeklyOversight(
    sectionResults.map(result => ({
      contract: result.contract,
      sprints: result.sprints,
      engagement: result.engagement,
    })),
    today,
    sections.length,
  )

  const divisionName = division.fullName || division.acronym || division.name

  const weeklyReportSections = sectionResults.flatMap(result => {
    const sprint = result.sprints.find(candidate =>
      isCurrentWeekSprint(candidate, today),
    )
    if (!sprint) return []
    return [{ sectionName: result.section.name, sprint }]
  })

  const weeklyReport = {
    divisionName,
    weekLabel: weeklyOversight.periodLabel,
    sections: weeklyReportSections,
  }

  const contractOversight = buildContractOversightSummary(
    divisionContract as SectionContract | null,
    today,
  )

  const boardActionRows = await client.fetch<
    { _id: string; title: string; dueDate?: string; status?: string }[]
  >(
    /* groq */ `
      *[_type == "boardAction" && division._ref == $divisionId]{
        _id,
        title,
        dueDate,
        status
      }
    `,
    { divisionId: division._id },
  )

  const boardActionsOversight = buildBoardActionsOversightSummary(
    boardActionRows ?? [],
    today,
    division.acronym || division.name,
  )

  const overdueBoardActions = (boardActionRows ?? [])
    .filter(
      row =>
        row.status !== 'completed' && row.dueDate && row.dueDate < today,
    )
    .map(row => ({
      _key: row._id,
      title: row.title,
      dueDate: row.dueDate!,
      daysOverdue: Math.max(
        0,
        Math.floor(
          (Date.parse(`${today}T00:00:00`) -
            Date.parse(`${row.dueDate}T00:00:00`)) /
            86_400_000,
        ),
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  const focusItems: AcFocusItems = {
    upcomingActivities: [],
    upcomingPeriodDeliverables: [],
    overdueActivities: [],
    overduePeriodDeliverables: [],
    pendingReviewTasks: [],
    revisionRequestedTasks: [],
    lateEngagements: [],
  }

  const actionTrackerItems: AcActionTrackerItem[] = []
  const sectionSprintMetrics: AcSectionSprintMetrics[] = []

  for (const result of sectionResults) {
    const { section, metrics, sprints } = result
    const tagged = {
      upcomingActivities: tagSection(metrics.upcomingActivities, section),
      upcomingPeriodDeliverables: tagSection(
        metrics.upcomingPeriodDeliverables,
        section,
      ),
      overdueActivities: tagSection(metrics.overdueActivities, section),
      overduePeriodDeliverables: tagSection(
        metrics.overduePeriodDeliverables,
        section,
      ),
      pendingReviewTasks: tagSection(metrics.pendingReviewTasks, section),
      revisionRequestedTasks: tagSection(
        metrics.revisionRequestedTasks,
        section,
      ),
      lateEngagements: tagSection(metrics.lateEngagements, section),
    }
    focusItems.upcomingActivities.push(...tagged.upcomingActivities)
    focusItems.upcomingPeriodDeliverables.push(
      ...tagged.upcomingPeriodDeliverables,
    )
    focusItems.overdueActivities.push(...tagged.overdueActivities)
    focusItems.overduePeriodDeliverables.push(
      ...tagged.overduePeriodDeliverables,
    )
    focusItems.pendingReviewTasks.push(...tagged.pendingReviewTasks)
    focusItems.revisionRequestedTasks.push(...tagged.revisionRequestedTasks)
    focusItems.lateEngagements.push(...tagged.lateEngagements)

    for (const item of metrics.actionTracker.items) {
      actionTrackerItems.push({
        ...item,
        sectionId: section._id,
        sectionName: section.name,
        sectionSlug: section.slug?.current,
        responsibleLabel:
          item.assigneeName?.trim() || section.name || 'Unassigned',
      })
    }

    const pulse = computeManagerSprintPulse({
      sprints,
      today,
      supervisorCount: Math.max(0, section.supervisorCount ?? 0),
    })
    sectionSprintMetrics.push({
      sectionId: section._id,
      sectionName: section.name,
      sectionSlug: section.slug?.current,
      weekLabel: pulse.weekLabel ?? metrics.activeSprint?.weekLabel,
      planned: pulse.planned,
      inReview: pulse.inReview,
      acceptedReady: pulse.acceptedReady,
      atRisk: pulse.atRisk,
      done: metrics.activeSprint?.done ?? 0,
      total: metrics.activeSprint?.total ?? 0,
    })
  }

  focusItems.upcomingActivities.sort(
    (a, b) => a.daysUntilDue - b.daysUntilDue,
  )
  focusItems.upcomingPeriodDeliverables.sort(
    (a, b) => a.daysUntilDue - b.daysUntilDue,
  )
  focusItems.overdueActivities.sort((a, b) => b.daysOverdue - a.daysOverdue)
  focusItems.overduePeriodDeliverables.sort(
    (a, b) => b.daysOverdue - a.daysOverdue,
  )
  focusItems.lateEngagements.sort((a, b) => b.daysLate - a.daysLate)

  actionTrackerItems.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    return a.daysUntilDue - b.daysUntilDue
  })

  const actionTracker = {
    total: actionTrackerItems.length,
    overdue: actionTrackerItems.filter(i => i.isOverdue).length,
    dueSoon: actionTrackerItems.filter(
      i => !i.isOverdue && i.daysUntilDue <= 7,
    ).length,
    items: actionTrackerItems,
  }

  return {
    acWorkspace,
    division,
    sections,
    contractOversight,
    activeSprints,
    weeklyOversight,
    weeklyReport,
    monthlyOversight,
    teamVelocity,
    boardActionsOversight,
    focusItems,
    sectionSprintMetrics,
    actionTracker,
    overdue: {
      stakeholderEngagements: focusItems.lateEngagements,
      periodDeliverables: focusItems.overduePeriodDeliverables,
      boardActions: overdueBoardActions,
      memos: [],
    },
  }
}
