import 'server-only'

import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import { getRichTextPlainText } from '@/lib/rich-text'
import { hasSubmittedEngagementReport } from '@/lib/stakeholder-engagement-report'
import { getProjectIdForSection } from '@/lib/project-access.server'
import { client } from '@/sanity/lib/client'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getStakeholderEngagementBySection } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-section'
import { getStakeholderEngagementForProject } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-project'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type {
  SprintTask,
  WeeklySprint,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

const MAX_RECENT_SPRINTS = 16
const MAX_REPORT_CHARS = 400

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function serializeSprintTask(task: SprintTask, sprint: WeeklySprint) {
  const submissions = (task.workSubmissions ?? []).map(submission => ({
    date: submission.date,
    status: submission.status,
    hours: submission.totalHours,
    fileName: submission.output?.asset?.originalFilename,
    submittedAt: submission.submittedAt,
  }))

  return {
    taskKey: task._key,
    title: getRichTextPlainText(task.description, 'Untitled task'),
    assigneeName: task.assigneeName,
    taskStatus: task.taskStatus,
    planStatus: task.status,
    revisionReason: task.revisionReason,
    activityCategory: task.activityCategory,
    initiativeTitle: task.initiativeTitle,
    activityTitle: task.activityTitle,
    contractTaskTitle: task.contractTaskTitle,
    sprintWeekLabel: sprint.weekLabel,
    sprintStatus: sprint.status,
    evidenceCount: submissions.length,
    evidence: submissions,
  }
}

function serializeStakeholderEntry(
  entry: NonNullable<StakeholderEngagement['stakeholders']>[number],
  today: string,
) {
  const hasReport = hasSubmittedEngagementReport(entry.engagementReport)
  const isPastDue =
    Boolean(entry.proposedDateOfEngagement) &&
    entry.proposedDateOfEngagement! < today &&
    !hasReport

  return {
    name: entry.name,
    designation: entry.designation,
    stakeholderCategory: entry.stakeholder,
    initiativeCode: entry.initiativeCode,
    proposedDateOfEngagement: entry.proposedDateOfEngagement,
    modeOfEngagement: entry.modeOfEngagement,
    priority: entry.priority,
    power: entry.power,
    interest: entry.interest,
    hasReport,
    isPastDue,
    engagementLead: entry.uraDelegation?.fullName,
    reportExcerpt: hasReport
      ? truncate(
          getRichTextPlainText(entry.engagementReport, ''),
          MAX_REPORT_CHARS,
        )
      : undefined,
    actionPoints: (entry.actionPoints ?? []).map(point => ({
      description: point.description,
      dueDate: point.dueDate,
      assigneeName: point.assignee?.fullName,
      isOverdue: Boolean(point.dueDate && point.dueDate < today),
    })),
  }
}

export function buildSectionAiContextPayload(input: {
  sectionName: string
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
}) {
  const { sectionName, contract, sprints, engagement, today } = input
  const metrics = computeSectionDashboardMetrics({
    contract,
    sprints,
    engagement,
    today,
  })

  const recentSprints = [...sprints]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, MAX_RECENT_SPRINTS)

  return {
    generatedAt: today,
    section: {
      name: sectionName,
      financialYear: metrics.fyLabel ?? contract?.financialYearLabel,
      managerName: metrics.managerName ?? contract?.manager?.fullName,
      contractStatus: metrics.contractStatus ?? contract?.status,
    },
    summary: {
      contractProgress: metrics.contractProgress,
      activeSprint: metrics.activeSprint,
      openSprintTasks: metrics.openSprintTasks,
      stakeholderEngagement: metrics.stakeholderEngagement,
      totals: metrics.totals,
      taskStatusBreakdown: metrics.taskStatusBreakdown,
      activityStatusBreakdown: metrics.activityStatusBreakdown,
    },
    atRisk: {
      overdueContractActivities: metrics.overdueActivities,
      overduePeriodDeliverables: metrics.overduePeriodDeliverables,
      pendingReviewSprintTasks: metrics.pendingReviewTasks,
      revisionRequestedSprintTasks: metrics.revisionRequestedTasks,
      lateStakeholderEngagements: metrics.lateEngagements,
    },
    upcomingStakeholderEngagements: metrics.upcomingEngagements,
    stakeholders: (engagement?.stakeholders ?? []).map(entry =>
      serializeStakeholderEntry(entry, today),
    ),
    sprints: recentSprints.map(sprint => ({
      id: sprint._id,
      weekLabel: sprint.weekLabel,
      weekStart: sprint.weekStart,
      weekEnd: sprint.weekEnd,
      status: sprint.status,
      supervisorName: sprint.supervisor.fullName,
      workstreamName: sprint.workstreamName,
      tasks: (sprint.tasks ?? []).map(task => serializeSprintTask(task, sprint)),
    })),
    contractObjectives: (contract?.objectives ?? []).map(objective => ({
      title: objective.title,
      code: objective.code,
      initiatives: (objective.initiatives ?? []).map(initiative => ({
        code: initiative.code,
        title: initiative.title,
        activities: (initiative.measurableActivities ?? []).map(activity => ({
          title: activity.title,
          status: activity.status,
          activityType: activity.activityType,
          reportingFrequency: activity.reportingFrequency,
        })),
      })),
    })),
  }
}

export async function loadSectionAskAiContext(sectionId: string) {
  const section = await client.fetch<{ _id: string; name: string } | null>(
    /* groq */ `*[_type == "section" && _id == $sectionId][0]{ _id, name }`,
    { sectionId },
  )
  if (!section) return null

  const parentProjectId = await getProjectIdForSection(sectionId)
  const today = new Date().toISOString().slice(0, 10)

  const [contract, sprints, engagement] = await Promise.all([
    getSectionContractBySection(sectionId),
    getSprintsBySection(sectionId),
    parentProjectId
      ? getStakeholderEngagementForProject(parentProjectId)
      : getStakeholderEngagementBySection(sectionId),
  ])

  return buildSectionAiContextPayload({
    sectionName: section.name,
    contract,
    sprints,
    engagement,
    today,
  })
}
