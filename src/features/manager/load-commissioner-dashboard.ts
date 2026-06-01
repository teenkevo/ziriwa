import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import type {
  AtRiskPeriodDeliverable,
  LateEngagement,
} from '@/lib/section-dashboard-metrics'
import { client } from '@/sanity/lib/client'
import { getDepartmentContractByDepartment } from '@/sanity/lib/department-contracts/get-department-contract-by-department'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import { computeInitiativeTrackSummary } from '@/lib/initiative-track-summary'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getStakeholderEngagementBySection } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-section'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type CommissionerDepartment = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current?: string }
}

type CommissionerSection = {
  _id: string
  name: string
  divisionId: string
}

export type CommissionerDashboardData = {
  department: CommissionerDepartment
  sections: CommissionerSection[]
  myContract: {
    completed: number
    total: number
    percent: number
  }
  initiativeHealth: {
    onTrack: number
    atRisk: number
    offTrack: number
    total: number
  }
  divisions: {
    count: number
    sectionCount: number
  }
  activeSprints: {
    count: number
    done: number
    total: number
  }
  boardActions: {
    total: number
    open: number
    overdue: number
    completed: number
  }
  overdue: {
    stakeholderEngagements: LateEngagement[]
    periodDeliverables: AtRiskPeriodDeliverable[]
    boardActions: { _key: string; title: string; dueDate: string; daysOverdue: number }[]
    memos: { _key: string; title: string; dueDate: string; daysOverdue: number }[]
  }
}

async function getViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

async function getCommissionerDepartment(): Promise<CommissionerDepartment | null> {
  const email = await getViewerEmail()
  if (!email) return null

  return client.fetch<CommissionerDepartment | null>(
    /* groq */ `
      coalesce(
        *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department->{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        }
      )
    `,
    { email },
  )
}

export async function loadCommissionerDashboardData(): Promise<CommissionerDashboardData | null> {
  const department = await getCommissionerDepartment()
  if (!department?._id) return null

  const [sections, divisionCount] = await Promise.all([
    client.fetch<CommissionerSection[]>(
      /* groq */ `
        *[_type == "section" && division->department._ref == $departmentId] | order(division->order asc, division->fullName asc, order asc, name asc) {
          _id,
          name,
          "divisionId": division._ref
        }
      `,
      { departmentId: department._id },
    ),
    client.fetch<number>(
      /* groq */ `count(*[_type == "division" && department._ref == $departmentId])`,
      { departmentId: department._id },
    ),
  ])

  const today = new Date().toISOString().slice(0, 10)

  const departmentContract = await getDepartmentContractByDepartment(
    department._id,
  )
  const myContractMetrics = computeSectionDashboardMetrics({
    contract: departmentContract as SectionContract | null,
    sprints: [],
    engagement: null,
    today,
  })
  const initiativeHealth = computeInitiativeTrackSummary(
    departmentContract as SectionContract | null,
    today,
  )

  const sectionMetrics = await Promise.all(
      sections.map(async section => {
        const [contract, sprints, engagement] = await Promise.all([
          getSectionContractBySection(section._id),
          getSprintsBySection(section._id),
          getStakeholderEngagementBySection(section._id),
        ])
        return computeSectionDashboardMetrics({
          contract,
          sprints,
          engagement,
          today,
        })
      }),
  )

  const completed = myContractMetrics.contractProgress.completed
  const total = myContractMetrics.contractProgress.total
  const activeSprints = sectionMetrics.reduce(
    (acc, metric) => {
      if (metric.activeSprint) {
        acc.count++
        acc.done += metric.activeSprint.done
        acc.total += metric.activeSprint.total
      }
      return acc
    },
    { count: 0, done: 0, total: 0 },
  )
  const boardActionRows = await client.fetch<
    { _id: string; title: string; dueDate?: string; status?: string }[]
  >(
    /* groq */ `
      *[_type == "boardAction" && department._ref == $departmentId]{
        _id,
        title,
        dueDate,
        status
      }
    `,
    { departmentId: department._id },
  )

  const boardActions = (boardActionRows ?? []).reduce(
    (acc, row) => {
      acc.total++
      if (row.status === 'completed') {
        acc.completed++
        return acc
      }
      acc.open++
      if (row.dueDate && row.dueDate < today) {
        acc.overdue++
      }
      return acc
    },
    { total: 0, open: 0, overdue: 0, completed: 0 },
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
  const stakeholderEngagements = sectionMetrics
    .flatMap(metric => metric.lateEngagements)
    .sort((a, b) => b.daysLate - a.daysLate)
  const periodDeliverables = sectionMetrics
    .flatMap(metric => metric.overduePeriodDeliverables)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  return {
    department,
    sections,
    myContract: {
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    },
    initiativeHealth,
    divisions: {
      count: divisionCount ?? 0,
      sectionCount: sections.length,
    },
    activeSprints,
    boardActions,
    overdue: {
      stakeholderEngagements,
      periodDeliverables,
      boardActions: overdueBoardActions,
      memos: [],
    },
  }
}
