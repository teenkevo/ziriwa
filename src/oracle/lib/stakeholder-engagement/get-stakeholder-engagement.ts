import { oracleQuery } from '@/lib/oracle/client'
import type {
  StakeholderEngagement,
  StakeholderEntry,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type EngagementRow = {
  _id: string
  section_id: string
  section_name: string
  financial_year_label: string
}

type EntryRow = {
  entry_id: string
  stakeholder_key: string
  sn: number | null
  stakeholder: string | null
  designation: string | null
  name: string
  phone_number: string | null
  email_address: string | null
  address: string | null
  objective_of_engagement: string | null
  initiative_code: string | null
  power: string | null
  interest: string | null
  priority: string | null
  stakeholder_expectations: string | null
  ura_expectations: string | null
  proposed_date_of_engagement: string | null
  mode_of_engagement: string | null
  engagement_report: string | null
  budget_highlights: string | null
  total_cost: number | null
  ura_delegation_staff_id: string | null
  ura_delegation_full_name: string | null
  ura_delegation_staff_id_number: string | null
}

export async function getStakeholderEngagementOracle(
  sectionId: string,
  financialYearLabel: string,
): Promise<StakeholderEngagement | null> {
  const engagements = await oracleQuery<EngagementRow>(
    `
      SELECT
        se.id AS "_id",
        s.id AS section_id,
        s.name AS section_name,
        se.financial_year_label AS financial_year_label
      FROM stakeholder_engagements se
      JOIN sections s ON s.id = se.section_id
      WHERE se.section_id = :sectionId
        AND se.financial_year_label = :financialYearLabel
      FETCH FIRST 1 ROWS ONLY
    `,
    { sectionId, financialYearLabel },
  )

  const e = engagements[0]
  if (!e) return null

  const entryRows = await oracleQuery<EntryRow>(
    `
      SELECT
        e.id AS entry_id,
        e.stakeholder_key AS stakeholder_key,
        e.sn AS sn,
        e.stakeholder AS stakeholder,
        e.designation AS designation,
        e.name AS name,
        e.phone_number AS phone_number,
        e.email_address AS email_address,
        e.address AS address,
        e.objective_of_engagement AS objective_of_engagement,
        e.initiative_code AS initiative_code,
        e.power AS power,
        e.interest AS interest,
        e.priority AS priority,
        e.stakeholder_expectations AS stakeholder_expectations,
        e.ura_expectations AS ura_expectations,
        e.proposed_date_of_engagement AS proposed_date_of_engagement,
        e.mode_of_engagement AS mode_of_engagement,
        e.engagement_report AS engagement_report,
        e.budget_highlights AS budget_highlights,
        e.total_cost AS total_cost,
        e.ura_delegation_staff_id AS ura_delegation_staff_id,
        coalesce(u.full_name, u.first_name || ' ' || u.last_name) AS ura_delegation_full_name,
        u.id_number AS ura_delegation_staff_id_number
      FROM stakeholder_entries e
      LEFT JOIN staff u ON u.id = e.ura_delegation_staff_id
      WHERE e.engagement_id = :engagementId
      ORDER BY e.sn NULLS LAST, e.name ASC
    `,
    { engagementId: e._id },
  )

  const stakeholders: StakeholderEntry[] = entryRows.map(r => {
    const entry: StakeholderEntry = {
      _key: r.stakeholder_key,
      sn: r.sn ?? undefined,
      stakeholder: r.stakeholder ?? undefined,
      designation: r.designation ?? undefined,
      name: r.name,
      phoneNumber: r.phone_number ?? undefined,
      emailAddress: r.email_address ?? undefined,
      address: r.address ?? undefined,
      objectiveOfEngagement: r.objective_of_engagement ?? undefined,
      initiativeCode: r.initiative_code ?? undefined,
      power: (r.power ?? undefined) as any,
      interest: (r.interest ?? undefined) as any,
      priority: (r.priority ?? undefined) as any,
      stakeholderExpectations: r.stakeholder_expectations ?? undefined,
      uraExpectations: r.ura_expectations ?? undefined,
      proposedDateOfEngagement: r.proposed_date_of_engagement ?? undefined,
      modeOfEngagement: r.mode_of_engagement ?? undefined,
      engagementReport: r.engagement_report ?? undefined,
      budgetHighlights: r.budget_highlights ?? undefined,
      totalCost: r.total_cost ?? undefined,
      uraDelegation: r.ura_delegation_staff_id
        ? {
            _id: r.ura_delegation_staff_id,
            fullName: r.ura_delegation_full_name ?? undefined,
            staffId: r.ura_delegation_staff_id_number ?? undefined,
          }
        : undefined,
    }

    return entry
  })

  return {
    _id: e._id,
    section: { _id: e.section_id, name: e.section_name },
    financialYearLabel: e.financial_year_label,
    stakeholders,
  }
}

