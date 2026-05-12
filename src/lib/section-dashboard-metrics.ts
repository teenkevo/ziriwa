/**
 * Pure, framework-agnostic metric computations for the sectional dashboard.
 *
 * Returns aggregatable structured numbers (counts, percents, breakdown maps,
 * sprint trend series, at-risk lists) so the same module can later power
 * divisional and departmental dashboards by combining per-section blobs.
 */

import type {
  SectionContract,
  DetailedTask,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type {
  WeeklySprint,
  SprintTask,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type {
  StakeholderEngagement,
  StakeholderEntry,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import { getPeriodInfo, type ReportingFrequency } from './reporting-periods'

const ACTIVITY_STATUSES = ['not_started', 'in_progress', 'completed'] as const
const TASK_STATUSES = [
  'to_do',
  'in_progress',
  'delivered',
  'in_review',
  'done',
] as const
const ACTIVITY_CATEGORIES = [
  'normal_flow',
  'compliance',
  'staff_development',
  'stakeholder_engagement',
] as const
const REPORTING_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'n/a'] as const

export type ActivityStatusKey = (typeof ACTIVITY_STATUSES)[number]
export type SprintTaskStatusKey = (typeof TASK_STATUSES)[number]
export type ActivityCategoryKey =
  | (typeof ACTIVITY_CATEGORIES)[number]
  | 'uncategorized'
export type ReportingFrequencyKey = (typeof REPORTING_FREQUENCIES)[number]

export type AtRiskActivity = {
  _key: string
  title: string
  targetDate: string
  daysOverdue: number
  objectiveTitle?: string
  initiativeTitle?: string
  activityType?: 'kpi' | 'cross-cutting'
}

export type AtRiskPeriodDeliverable = {
  _key: string
  title: string
  periodLabel: string
  endDate: string
  daysOverdue: number
  activityTitle?: string
  initiativeTitle?: string
  objectiveTitle?: string
}

export type AtRiskSprintTask = {
  _key: string
  title: string
  sprintWeekLabel?: string
  sprintId: string
  taskStatus?: SprintTask['taskStatus']
  assigneeName?: string | null
}

export type LateEngagement = {
  _key: string
  name: string
  proposedDate: string
  daysLate: number
  modeOfEngagement?: string
}

export type UpcomingEngagement = {
  _key: string
  name: string
  proposedDate: string
  modeOfEngagement?: string
  designation?: string
}

export type ObjectiveProgress = {
  _key: string
  code?: string
  title: string
  completed: number
  total: number
  percent: number
}

export type WeeklySprintPoint = {
  sprintId: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  doneTasks: number
  acceptedTasks: number
  totalTasks: number
}

export type OfficerLoad = {
  staffId: string
  fullName: string
  active: number
  doneThisMonth: number
}

export type StakeholderQuadrantCounts = {
  manageClosely: number
  keepSatisfied: number
  keepInformed: number
  monitor: number
  uncategorized: number
}

export type ActiveSprintSummary = {
  sprintId: string
  weekLabel: string
  supervisorName?: string
  accepted: number
  total: number
  done: number
} | null

export type SectionDashboardMetrics = {
  fyLabel?: string
  contractStatus?: string
  managerName?: string
  lastSprintWeekLabel?: string
  lastSprintStatus?: WeeklySprint['status']

  contractProgress: { completed: number; total: number; percent: number }
  activeSprint: ActiveSprintSummary
  openSprintTasks: number
  stakeholderEngagement: { total: number; withReport: number }

  totals: {
    objectives: number
    initiatives: number
    activities: number
    kpiActivities: number
    crossCuttingActivities: number
  }

  activityStatusBreakdown: Record<ActivityStatusKey, number>
  taskStatusBreakdown: Record<SprintTaskStatusKey, number>
  activityCategoryBreakdown: Record<ActivityCategoryKey, number>
  reportingFrequencyMix: Record<ReportingFrequencyKey, number>

  weeklyTrend: WeeklySprintPoint[]

  officerLoad: OfficerLoad[]

  objectiveProgress: ObjectiveProgress[]

  overdueActivities: AtRiskActivity[]
  overduePeriodDeliverables: AtRiskPeriodDeliverable[]
  pendingReviewTasks: AtRiskSprintTask[]
  revisionRequestedTasks: AtRiskSprintTask[]
  lateEngagements: LateEngagement[]

  stakeholderQuadrants: StakeholderQuadrantCounts
  stakeholderPriorityMix: { H: number; M: number; L: number; unknown: number }
  upcomingEngagements: UpcomingEngagement[]
}

function diffDays(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00')
  const b = new Date(toIso + 'T00:00:00')
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

function isSameMonth(iso: string, today: string): boolean {
  return iso.slice(0, 7) === today.slice(0, 7)
}

function emptyActivityStatus(): Record<ActivityStatusKey, number> {
  return { not_started: 0, in_progress: 0, completed: 0 }
}

function emptyTaskStatus(): Record<SprintTaskStatusKey, number> {
  return { to_do: 0, in_progress: 0, delivered: 0, in_review: 0, done: 0 }
}

function emptyCategoryBreakdown(): Record<ActivityCategoryKey, number> {
  return {
    normal_flow: 0,
    compliance: 0,
    staff_development: 0,
    stakeholder_engagement: 0,
    uncategorized: 0,
  }
}

function emptyFrequencyMix(): Record<ReportingFrequencyKey, number> {
  return { weekly: 0, monthly: 0, quarterly: 0, 'n/a': 0 }
}

export function computeSectionDashboardMetrics(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
}): SectionDashboardMetrics {
  const { contract, sprints, engagement, today } = input

  // ---- Contract walk: status, totals, status breakdown, per-objective progress, frequencies
  const activityStatusBreakdown = emptyActivityStatus()
  const reportingFrequencyMix = emptyFrequencyMix()
  let objectivesCount = 0
  let initiativesCount = 0
  let activitiesCount = 0
  let kpiActivitiesCount = 0
  let crossCuttingActivitiesCount = 0
  let contractCompletedActivities = 0

  const objectiveProgress: ObjectiveProgress[] = []
  const overdueActivities: AtRiskActivity[] = []
  const overduePeriodDeliverables: AtRiskPeriodDeliverable[] = []

  for (const obj of contract?.objectives ?? []) {
    objectivesCount++
    let objCompleted = 0
    let objTotal = 0

    for (const init of obj.initiatives ?? []) {
      initiativesCount++
      for (const act of init.measurableActivities ?? []) {
        activitiesCount++
        objTotal++
        if (act.activityType === 'kpi') kpiActivitiesCount++
        else if (act.activityType === 'cross-cutting') crossCuttingActivitiesCount++

        const statusKey = (act.status as ActivityStatusKey | undefined) ?? 'not_started'
        if (statusKey in activityStatusBreakdown) {
          activityStatusBreakdown[statusKey]++
        } else {
          activityStatusBreakdown.not_started++
        }

        if (act.status === 'completed') {
          objCompleted++
          contractCompletedActivities++
        }

        const freq = (act.reportingFrequency ?? 'n/a') as ReportingFrequencyKey
        if (freq in reportingFrequencyMix) reportingFrequencyMix[freq]++

        // Overdue: activity targetDate in the past + status != completed
        if (
          act.targetDate &&
          act.targetDate < today &&
          act.status !== 'completed'
        ) {
          overdueActivities.push({
            _key: act._key,
            title: act.title,
            targetDate: act.targetDate,
            daysOverdue: diffDays(act.targetDate, today),
            objectiveTitle: obj.title,
            initiativeTitle: init.title,
            activityType: act.activityType,
          })
        }

        // KPI tasks: scan periodDeliverables for overdue (period end < today, status != done)
        if (act.activityType === 'kpi' && act.tasks?.length) {
          for (const t of act.tasks) {
            const task = typeof t === 'string' ? null : (t as DetailedTask)
            if (!task) continue
            const freqT = task.reportingFrequency
            if (!freqT || freqT === 'n/a') continue
            for (const pd of task.periodDeliverables ?? []) {
              if (!pd.periodKey || pd.status === 'done') continue
              const info = getPeriodInfo(
                pd.periodKey,
                freqT as ReportingFrequency,
              )
              if (!info) continue
              if (info.endDate < today) {
                overduePeriodDeliverables.push({
                  _key: `${act._key}-${task._key ?? 'task'}-${pd.periodKey}`,
                  title: task.task || act.title,
                  periodLabel: info.label,
                  endDate: info.endDate,
                  daysOverdue: diffDays(info.endDate, today),
                  activityTitle: act.title,
                  initiativeTitle: init.title,
                  objectiveTitle: obj.title,
                })
              }
            }
          }
        }
      }
    }

    objectiveProgress.push({
      _key: obj._key,
      code: obj.code,
      title: obj.title,
      completed: objCompleted,
      total: objTotal,
      percent: objTotal === 0 ? 0 : Math.round((objCompleted / objTotal) * 100),
    })
  }

  const contractProgress = {
    completed: contractCompletedActivities,
    total: activitiesCount,
    percent:
      activitiesCount === 0
        ? 0
        : Math.round((contractCompletedActivities / activitiesCount) * 100),
  }

  overdueActivities.sort((a, b) => b.daysOverdue - a.daysOverdue)
  overduePeriodDeliverables.sort((a, b) => b.daysOverdue - a.daysOverdue)
  objectiveProgress.sort((a, b) => {
    const ac = a.code ?? ''
    const bc = b.code ?? ''
    return ac.localeCompare(bc)
  })

  // ---- Sprints walk: task status, category, weekly trend, active sprint, officer load
  const taskStatusBreakdown = emptyTaskStatus()
  const activityCategoryBreakdown = emptyCategoryBreakdown()
  const pendingReviewTasks: AtRiskSprintTask[] = []
  const revisionRequestedTasks: AtRiskSprintTask[] = []
  let openSprintTasks = 0

  // Sort sprints by weekStart desc (defensively; fetch already orders)
  const sortedSprints = [...sprints].sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart),
  )

  let lastSprintWeekLabel: string | undefined
  let lastSprintStatus: WeeklySprint['status'] | undefined
  let activeSprint: ActiveSprintSummary = null

  type OfficerAgg = {
    staffId: string
    fullName: string
    active: number
    doneThisMonth: number
  }
  const officerAgg = new Map<string, OfficerAgg>()

  for (const sprint of sortedSprints) {
    if (!lastSprintWeekLabel) {
      lastSprintWeekLabel = sprint.weekLabel
      lastSprintStatus = sprint.status
    }

    const isCurrentWeek =
      sprint.weekStart <= today && today <= sprint.weekEnd
    const isThisMonth = isSameMonth(sprint.weekStart, today)

    let sprintAccepted = 0
    let sprintDone = 0
    let sprintTotal = 0

    for (const task of sprint.tasks ?? []) {
      sprintTotal++
      const tStatusKey = (task.taskStatus ?? 'to_do') as SprintTaskStatusKey
      if (tStatusKey in taskStatusBreakdown) taskStatusBreakdown[tStatusKey]++

      const cat = (task.activityCategory ?? 'uncategorized') as ActivityCategoryKey
      if (cat in activityCategoryBreakdown) activityCategoryBreakdown[cat]++
      else activityCategoryBreakdown.uncategorized++

      if (task.status === 'accepted') sprintAccepted++
      if (task.taskStatus === 'done') sprintDone++

      if (task.taskStatus !== 'done') openSprintTasks++

      if (sprint.status === 'submitted' && task.status === 'pending') {
        pendingReviewTasks.push({
          _key: task._key,
          title: task.description,
          sprintWeekLabel: sprint.weekLabel,
          sprintId: sprint._id,
          taskStatus: task.taskStatus,
          assigneeName: task.assigneeName,
        })
      }

      if (task.status === 'revisions_requested') {
        revisionRequestedTasks.push({
          _key: task._key,
          title: task.description,
          sprintWeekLabel: sprint.weekLabel,
          sprintId: sprint._id,
          taskStatus: task.taskStatus,
          assigneeName: task.assigneeName,
        })
      }

      // Officer load aggregation: only count assigned tasks
      if (task.assignee) {
        const existing = officerAgg.get(task.assignee) ?? {
          staffId: task.assignee,
          fullName: task.assigneeName ?? 'Unassigned',
          active: 0,
          doneThisMonth: 0,
        }
        if (task.taskStatus !== 'done' && task.status === 'accepted') {
          existing.active++
        }
        if (task.taskStatus === 'done' && isThisMonth) {
          existing.doneThisMonth++
        }
        if (task.assigneeName && !existing.fullName) {
          existing.fullName = task.assigneeName
        }
        officerAgg.set(task.assignee, existing)
      }
    }

    if (isCurrentWeek && !activeSprint) {
      activeSprint = {
        sprintId: sprint._id,
        weekLabel: sprint.weekLabel,
        supervisorName: sprint.supervisor?.fullName,
        accepted: sprintAccepted,
        total: sprintTotal,
        done: sprintDone,
      }
    }
  }

  // Weekly trend = last 8 sprints in chronological order
  const weeklyTrend: WeeklySprintPoint[] = sortedSprints
    .slice(0, 8)
    .map(sprint => {
      let done = 0
      let accepted = 0
      let total = 0
      for (const task of sprint.tasks ?? []) {
        total++
        if (task.status === 'accepted') accepted++
        if (task.taskStatus === 'done') done++
      }
      return {
        sprintId: sprint._id,
        weekLabel: sprint.weekLabel,
        weekStart: sprint.weekStart,
        weekEnd: sprint.weekEnd,
        doneTasks: done,
        acceptedTasks: accepted,
        totalTasks: total,
      }
    })
    .reverse()

  const officerLoad: OfficerLoad[] = Array.from(officerAgg.values())
    .sort((a, b) => b.active - a.active || b.doneThisMonth - a.doneThisMonth)
    .slice(0, 12)

  pendingReviewTasks.sort((a, b) =>
    (a.sprintWeekLabel ?? '').localeCompare(b.sprintWeekLabel ?? ''),
  )
  revisionRequestedTasks.sort((a, b) =>
    (a.sprintWeekLabel ?? '').localeCompare(b.sprintWeekLabel ?? ''),
  )

  // ---- Stakeholders
  const stakeholderQuadrants: StakeholderQuadrantCounts = {
    manageClosely: 0,
    keepSatisfied: 0,
    keepInformed: 0,
    monitor: 0,
    uncategorized: 0,
  }
  const stakeholderPriorityMix = { H: 0, M: 0, L: 0, unknown: 0 }
  const lateEngagements: LateEngagement[] = []
  const upcomingEngagements: UpcomingEngagement[] = []
  let stakeholderTotal = 0
  let stakeholderWithReport = 0

  const in30Days = (() => {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })()

  const entries: StakeholderEntry[] = engagement?.stakeholders ?? []
  for (const entry of entries) {
    stakeholderTotal++
    const report = entry.engagementReport?.trim()
    if (report) stakeholderWithReport++

    // Quadrants
    if (entry.power === 'H' && entry.interest === 'H') {
      stakeholderQuadrants.manageClosely++
    } else if (entry.power === 'H' && entry.interest === 'L') {
      stakeholderQuadrants.keepSatisfied++
    } else if (entry.power === 'L' && entry.interest === 'H') {
      stakeholderQuadrants.keepInformed++
    } else if (entry.power === 'L' && entry.interest === 'L') {
      stakeholderQuadrants.monitor++
    } else {
      stakeholderQuadrants.uncategorized++
    }

    // Priority mix
    const pr = entry.priority
    if (pr === 'H') stakeholderPriorityMix.H++
    else if (pr === 'M') stakeholderPriorityMix.M++
    else if (pr === 'L') stakeholderPriorityMix.L++
    else stakeholderPriorityMix.unknown++

    // Late engagements
    if (
      entry.proposedDateOfEngagement &&
      entry.proposedDateOfEngagement < today &&
      !report
    ) {
      lateEngagements.push({
        _key: entry._key,
        name: entry.name,
        proposedDate: entry.proposedDateOfEngagement,
        daysLate: diffDays(entry.proposedDateOfEngagement, today),
        modeOfEngagement: entry.modeOfEngagement,
      })
    }

    // Upcoming engagements: today..today+30, not yet reported
    if (
      entry.proposedDateOfEngagement &&
      entry.proposedDateOfEngagement >= today &&
      entry.proposedDateOfEngagement <= in30Days &&
      !report
    ) {
      upcomingEngagements.push({
        _key: entry._key,
        name: entry.name,
        proposedDate: entry.proposedDateOfEngagement,
        modeOfEngagement: entry.modeOfEngagement,
        designation: entry.designation,
      })
    }
  }

  lateEngagements.sort((a, b) => b.daysLate - a.daysLate)
  upcomingEngagements.sort((a, b) =>
    a.proposedDate.localeCompare(b.proposedDate),
  )

  return {
    fyLabel: contract?.financialYearLabel,
    contractStatus: contract?.status,
    managerName: contract?.manager?.fullName,
    lastSprintWeekLabel,
    lastSprintStatus,

    contractProgress,
    activeSprint,
    openSprintTasks,
    stakeholderEngagement: {
      total: stakeholderTotal,
      withReport: stakeholderWithReport,
    },

    totals: {
      objectives: objectivesCount,
      initiatives: initiativesCount,
      activities: activitiesCount,
      kpiActivities: kpiActivitiesCount,
      crossCuttingActivities: crossCuttingActivitiesCount,
    },

    activityStatusBreakdown,
    taskStatusBreakdown,
    activityCategoryBreakdown,
    reportingFrequencyMix,

    weeklyTrend,

    officerLoad,

    objectiveProgress,

    overdueActivities,
    overduePeriodDeliverables,
    pendingReviewTasks,
    revisionRequestedTasks,
    lateEngagements,

    stakeholderQuadrants,
    stakeholderPriorityMix,
    upcomingEngagements,
  }
}
