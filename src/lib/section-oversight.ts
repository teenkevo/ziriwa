import { addDays, format, parseISO, startOfWeek } from 'date-fns'

import { buildContractOversightSummary } from '@/lib/contract-oversight'
import type { ContractOversightSummary } from '@/lib/contract-oversight'
import {
  computeOfficerMonthlyOversight,
  computeOfficerWeeklyOversight,
} from '@/lib/officer-oversight'
import {
  computeSectionMonthlyOversight,
  computeSectionWeeklyOversight,
  type MonthlyOversightSummary,
} from '@/lib/monthly-oversight'
import {
  countReportableSprintTasks,
  isCurrentWeekSprint,
} from '@/lib/sprint-report-readiness'
import { hasSubmittedEngagementReport } from '@/lib/stakeholder-engagement-report'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
export type SectionWeeklyReportPayload = {
  divisionName: string
  weekLabel: string
  sections: { sectionName: string; sprint: WeeklySprint }[]
}

export type StakeholderOversightSummary = {
  periodLabel: string
  total: number
  subtitle: string
  breakdown: {
    total: number
    reported: number
    pending: number
  }
}

function getCurrentWeekRange(today: string) {
  const todayDate = parseISO(today)
  const weekStartDate = startOfWeek(todayDate, { weekStartsOn: 1 })
  const weekEndDate = addDays(weekStartDate, 6)
  return {
    weekStart: format(weekStartDate, 'yyyy-MM-dd'),
    weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
  }
}

function isInCalendarMonth(isoDate: string, today: string): boolean {
  return isoDate.slice(0, 7) === today.slice(0, 7)
}

export function isSectionWeeklyReportReady(
  sprints: WeeklySprint[],
  today: string,
): boolean {
  const currentSprint = sprints.find(sprint =>
    isCurrentWeekSprint(sprint, today),
  )
  if (!currentSprint) return false
  return countReportableSprintTasks(currentSprint) > 0
}

export function isSectionMonthlyReportReady(
  engagement: StakeholderEngagement | null,
  today: string,
): boolean {
  let engagementsDue = 0

  for (const entry of engagement?.stakeholders ?? []) {
    if (
      entry.proposedDateOfEngagement &&
      isInCalendarMonth(entry.proposedDateOfEngagement, today)
    ) {
      engagementsDue++
      if (!hasSubmittedEngagementReport(entry.engagementReport)) {
        return false
      }
    }
  }

  return engagementsDue > 0
}

export function buildSectionWeeklyOversightSummary(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
  officerStaffId?: string
}): MonthlyOversightSummary {
  const breakdown = input.officerStaffId
    ? computeOfficerWeeklyOversight({
        contract: input.contract,
        sprints: input.sprints,
        officerStaffId: input.officerStaffId,
        today: input.today,
      })
    : computeSectionWeeklyOversight(input)
  const total = breakdown.sprints + breakdown.engagements + breakdown.tasks

  const { weekStart, weekEnd } = getCurrentWeekRange(input.today)
  let periodLabel = `${weekStart} - ${weekEnd}`
  try {
    periodLabel = `${format(parseISO(weekStart), 'MMM d')} - ${format(parseISO(weekEnd), 'MMM d')}`
  } catch {
    // keep ISO fallback
  }

  const subtitle =
    total === 0
      ? 'No scheduled activities'
      : `${total} ${total === 1 ? 'item' : 'items'} scheduled`
  return {
    monthLabel: `${weekStart} - ${weekEnd}`,
    periodLabel,
    total,
    subtitle,
    reportReady: isSectionWeeklyReportReady(input.sprints, input.today),
    breakdown,
    sectionsWithActivity: total > 0 ? 1 : 0,
    sectionTotal: 1,
  }
}

export function buildSectionMonthlyOversightSummary(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
  officerStaffId?: string
}): MonthlyOversightSummary {
  const breakdown = input.officerStaffId
    ? computeOfficerMonthlyOversight({
        contract: input.contract,
        sprints: input.sprints,
        officerStaffId: input.officerStaffId,
        today: input.today,
      })
    : computeSectionMonthlyOversight(input)
  const total = breakdown.sprints + breakdown.engagements + breakdown.tasks

  let periodLabel = input.today.slice(0, 7)
  try {
    periodLabel = format(parseISO(input.today), 'MMMM')
  } catch {
    // keep ISO fallback
  }

  const subtitle =
    total === 0
      ? 'No scheduled activities'
      : `${total} ${total === 1 ? 'item' : 'items'} scheduled`

  return {
    monthLabel: periodLabel,
    periodLabel,
    total,
    subtitle,
    reportReady: input.officerStaffId
      ? false
      : isSectionMonthlyReportReady(input.engagement, input.today),
    breakdown,
    sectionsWithActivity: total > 0 ? 1 : 0,
    sectionTotal: 1,
  }
}

export function buildSectionContractOversightSummary(
  contract: SectionContract | null,
  today: string,
): ContractOversightSummary {
  return buildContractOversightSummary(contract, today)
}

export function buildStakeholderOversightSummary(
  engagement: StakeholderEngagement | null,
  financialYearLabel?: string,
): StakeholderOversightSummary {
  const stakeholders = engagement?.stakeholders ?? []
  let reported = 0

  for (const entry of stakeholders) {
    if (hasSubmittedEngagementReport(entry.engagementReport)) {
      reported++
    }
  }

  const total = stakeholders.length
  const pending = total - reported

  return {
    periodLabel: financialYearLabel?.trim() || 'This FY',
    total,
    subtitle:
      total === 0
        ? 'No stakeholders onboarded'
        : `${reported} reported • ${pending} pending`,
    breakdown: {
      total,
      reported,
      pending,
    },
  }
}

export function buildSectionWeeklyReportPayload(input: {
  sectionName: string
  sprints: WeeklySprint[]
  today: string
  weekLabel: string
}): SectionWeeklyReportPayload {
  const currentSprint = input.sprints.find(sprint =>
    isCurrentWeekSprint(sprint, input.today),
  )

  return {
    divisionName: input.sectionName,
    weekLabel: input.weekLabel,
    sections: currentSprint
      ? [{ sectionName: input.sectionName, sprint: currentSprint }]
      : [],
  }
}
