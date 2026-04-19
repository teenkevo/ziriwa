import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getStakeholderEngagementOracle } from '@/oracle/lib/stakeholder-engagement/get-stakeholder-engagement'

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
  financialYearLabel?: string
  stakeholders?: StakeholderEntry[]
}

/**
 * Get the stakeholder engagement document for a section and financial year.
 * One engagement doc per section per FY.
 */
export async function getStakeholderEngagement(
  sectionId: string,
  financialYearLabel: string,
): Promise<StakeholderEngagement | null> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getStakeholderEngagementOracle(sectionId, financialYearLabel)
  }

  const query = defineQuery(`
    *[_type == "stakeholderEngagement" && section._ref == $sectionId && financialYearLabel == $financialYearLabel][0] {
      _id,
      section->{ _id, name },
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
