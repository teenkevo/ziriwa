import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import type { WorkContextMode } from '@/lib/section-access'
import {
  resolveCommissionerWorkspace,
  type CommissionerWorkspaceContext,
} from '@/lib/commissioner-workspace.server'
import { client } from '@/sanity/lib/client'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

export type CommissionerStakeholderRow = StakeholderEntry & {
  rowId: string
  engagementId: string
  stakeholderIndex: number
  sectionId: string
  sectionName: string
  sectionSlug?: string
  divisionId: string
  divisionName: string
  financialYearLabel?: string
}

export type CommissionerStakeholderEngagementsData = {
  commissionerWorkspace: CommissionerWorkspaceContext
  departmentName: string
  financialYearLabel: string
  rows: CommissionerStakeholderRow[]
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

type EngagementDoc = {
  _id: string
  financialYearLabel?: string
  sectionId: string
  sectionName: string
  sectionSlug?: { current?: string }
  divisionId: string
  divisionName: string
  stakeholders?: StakeholderEntry[]
}

export async function loadCommissionerStakeholderEngagementsData(options?: {
  workContext?: WorkContextMode
}): Promise<CommissionerStakeholderEngagementsData | null> {
  const commissionerWorkspace = await resolveCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!commissionerWorkspace) return null

  const department = commissionerWorkspace.department
  if (!department?._id) return null

  const financialYearLabel = getCurrentFinancialYear().label

  const engagements = await client.fetch<EngagementDoc[]>(
    /* groq */ `
      *[_type == "stakeholderEngagement"
        && defined(section._ref)
        && !defined(project._ref)
        && section->division->department._ref == $departmentId
        && financialYearLabel == $financialYearLabel
      ] | order(
        coalesce(section->division->fullName, section->division->name) asc,
        section->order asc,
        section->name asc
      ) {
        _id,
        financialYearLabel,
        "sectionId": section._ref,
        "sectionName": section->name,
        "sectionSlug": section->slug,
        "divisionId": section->division._ref,
        "divisionName": coalesce(section->division->acronym, section->division->name),
        stakeholders[] {
          _key,
          sn,
          stakeholder,
          designation,
          name,
          phoneNumber,
          emailAddress,
          address,
          objectiveOfEngagement,
          initiativeCode,
          power,
          interest,
          priority,
          stakeholderExpectations,
          uraExpectations,
          proposedDateOfEngagement,
          modeOfEngagement,
          engagementReport,
          budgetHighlights,
          totalCost,
          "uraDelegation": uraDelegation->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName), staffId }
        }
      }
    `,
    {
      departmentId: department._id,
      financialYearLabel,
    },
  )

  const rows: CommissionerStakeholderRow[] = []

  for (const engagement of engagements ?? []) {
    const stakeholders = engagement.stakeholders ?? []
    stakeholders.forEach((entry, index) => {
      rows.push({
        ...entry,
        rowId: `${engagement._id}-${entry._key}`,
        engagementId: engagement._id,
        stakeholderIndex: index,
        sectionId: engagement.sectionId,
        sectionName: engagement.sectionName,
        sectionSlug: engagement.sectionSlug?.current,
        divisionId: engagement.divisionId,
        divisionName: engagement.divisionName,
        financialYearLabel: engagement.financialYearLabel,
      })
    })
  }

  return {
    commissionerWorkspace,
    departmentName: department.name,
    financialYearLabel,
    rows,
  }
}
