import 'server-only'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import type { WorkContextMode } from '@/lib/section-access'
import {
  resolveAssistantCommissionerWorkspace,
  type AssistantCommissionerWorkspaceContext,
} from '@/lib/assistant-commissioner-workspace.server'
import { client } from '@/sanity/lib/client'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

export type AssistantCommissionerStakeholderRow = StakeholderEntry & {
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

export type AssistantCommissionerStakeholderEngagementsData = {
  acWorkspace: AssistantCommissionerWorkspaceContext
  divisionName: string
  financialYearLabel: string
  rows: AssistantCommissionerStakeholderRow[]
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

export async function loadAssistantCommissionerStakeholderEngagementsData(options?: {
  workContext?: WorkContextMode
}): Promise<AssistantCommissionerStakeholderEngagementsData | null> {
  const acWorkspace = await resolveAssistantCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!acWorkspace) return null
  const division = acWorkspace.division
  if (!division?._id) return null

  const divisionName =
    division.fullName || division.acronym || division.name
  const financialYearLabel = getCurrentFinancialYear().label

  const engagements = await client.fetch<EngagementDoc[]>(
    /* groq */ `
      *[_type == "stakeholderEngagement"
        && defined(section._ref)
        && !defined(project._ref)
        && section->division._ref == $divisionId
        && financialYearLabel == $financialYearLabel
      ] | order(section->order asc, section->name asc) {
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
          attendanceSheet {
            asset->{ _id, url, originalFilename, size, mimeType },
          },
          budgetHighlights,
          totalCost,
          "uraDelegation": uraDelegation->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName), staffId }
        }
      }
    `,
    {
      divisionId: division._id,
      financialYearLabel,
    },
  )

  const rows: AssistantCommissionerStakeholderRow[] = []

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
    acWorkspace,
    divisionName,
    financialYearLabel,
    rows,
  }
}
