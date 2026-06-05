import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type StakeholderEntry = {
  _key: string
  sn?: number
  stakeholder?: string
  designation?: string
  name: string
  phoneNumber?: string
  emailAddress?: string
  address?: string
  objectiveOfEngagement?: string
  initiativeCode?: string
  power?: 'H' | 'M' | 'L'
  interest?: 'H' | 'M' | 'L'
  priority?: 'H' | 'M' | 'L'
  stakeholderExpectations?: string
  uraExpectations?: string
  proposedDateOfEngagement?: string
  modeOfEngagement?: string
  engagementReport?: string
  budgetHighlights?: string
  totalCost?: number
  uraDelegation?: { _id: string; fullName?: string; staffId?: string }
}

export type StakeholderEngagement = {
  _id: string
  section?: { _id: string; name: string }
  project?: { _id: string; name: string }
  financialYearLabel?: string
  stakeholders?: StakeholderEntry[]
}

const STAKEHOLDER_ENGAGEMENT_PROJECTION = `
  _id,
  section->{ _id, name },
  project->{ _id, name },
  financialYearLabel,
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
    "uraDelegation": uraDelegation->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName), staffId },
  },
`

/**
 * Section (or workstream) engagement for a financial year.
 */
export async function getStakeholderEngagement(
  sectionId: string,
  financialYearLabel: string,
): Promise<StakeholderEngagement | null> {
  const query = defineQuery(`
    *[_type == "stakeholderEngagement"
      && section._ref == $sectionId
      && !defined(project._ref)
      && financialYearLabel == $financialYearLabel
    ][0] {
      ${STAKEHOLDER_ENGAGEMENT_PROJECTION}
    }
  `)

  try {
    const doc = await sanityFetch({
      query,
      params: { sectionId, financialYearLabel },
      revalidate: 0,
    })
    return doc || null
  } catch (error) {
    console.error('Error fetching stakeholder engagement', error)
    return null
  }
}

/**
 * Project-level engagement for a financial year (separate from workstream sections).
 */
export async function getStakeholderEngagementByProject(
  projectId: string,
  financialYearLabel: string,
): Promise<StakeholderEngagement | null> {
  const query = defineQuery(`
    *[_type == "stakeholderEngagement"
      && project._ref == $projectId
      && financialYearLabel == $financialYearLabel
    ][0] {
      ${STAKEHOLDER_ENGAGEMENT_PROJECTION}
    }
  `)

  try {
    const doc = await sanityFetch({
      query,
      params: { projectId, financialYearLabel },
      revalidate: 0,
    })
    return doc || null
  } catch (error) {
    console.error('Error fetching project stakeholder engagement', error)
    return null
  }
}
