import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSectionContractOracle } from '@/oracle/lib/section-contracts/get-section-contract'

export type DeliverableItem = {
  _key?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  tag?: 'support' | 'main'
  locked?: boolean
}

export type PeriodDeliverableItem = {
  _key?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  tag?: 'support' | 'main'
  locked?: boolean
}

export type PeriodDeliverableReviewEntry = {
  _key?: string
  author?: { _id: string; fullName?: string }
  role?: 'officer' | 'supervisor'
  action?: 'submit' | 'reject' | 'approve' | 'respond'
  message?: string
  createdAt?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
}

export type PeriodDeliverable = {
  _key?: string
  periodKey?: string
  status?: 'pending' | 'delivered' | 'in_review' | 'done'
  submittedAt?: string
  deliverable?: PeriodDeliverableItem[]
  deliverableReviewThread?: PeriodDeliverableReviewEntry[]
}

export type InputsReviewEntry = {
  _key?: string
  author?: { _id: string; fullName?: string }
  role?: 'officer' | 'supervisor'
  action?: 'submit' | 'reject' | 'approve' | 'respond'
  message?: string
  createdAt?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
}

export type DeliverableReviewEntry = InputsReviewEntry

export type TaskInputs = {
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  submittedAt?: string
}

export type DetailedTask = {
  _key?: string
  task: string
  priority?: string
  assignee?: { _id: string; fullName?: string; staffId?: string }
  inputs?: TaskInputs
  inputsReviewThread?: InputsReviewEntry[]
  deliverableReviewThread?: DeliverableReviewEntry[]
  status?: string
  targetDate?: string
  reportingFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'n/a'
  expectedDeliverable?: string
  reportingPeriodStart?: string
  periodDeliverables?: PeriodDeliverable[]
  deliverable?: DeliverableItem[]
}

export type MeasurableActivity = {
  _key: string
  activityType: 'kpi' | 'cross-cutting'
  title: string
  aim?: string
  order?: number
  targetDate?: string
  status?: string
  reportingFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'n/a'
  evidence?: { asset?: { url?: string } }[]
  tasks?: (DetailedTask | string)[]
}

export type ContractInitiative = {
  _key: string
  code?: string
  title: string
  order?: number
  measurableActivities?: MeasurableActivity[]
}

export type SsmartaObjective = {
  _key: string
  code?: string
  title: string
  order?: number
  initiatives?: ContractInitiative[]
}

export type SectionContract = {
  _id: string
  section?: { _id: string; name: string }
  financialYearLabel?: string
  manager?: { _id: string; fullName?: string }
  status?: string
  objectives?: SsmartaObjective[]
}

/** Flatten initiatives from objectives for dropdowns (e.g. stakeholder engagement link). */
export function flattenInitiatives(
  contract: SectionContract | null,
): { code: string; title: string }[] {
  if (!contract?.objectives) return []
  const out: { code: string; title: string }[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      const code = init.code ?? init._key ?? ''
      if (code && init.title) out.push({ code, title: init.title })
    }
  }
  return out
}

/**
 * Get the section contract for a section and financial year label.
 * One contract per section per FY. Includes embedded objectives.
 */
export async function getSectionContract(
  sectionId: string,
  financialYearLabel: string,
): Promise<SectionContract | null> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSectionContractOracle(sectionId, financialYearLabel)
  }

  const query = defineQuery(`
    *[_type == "sectionContract" && section._ref == $sectionId && financialYearLabel == $financialYearLabel][0] {
      _id,
      section->{ _id, name },
      financialYearLabel,
      manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      status,
      objectives[] {
        _key,
        code,
        title,
        order,
        initiatives[] {
          _key,
          code,
          title,
          order,
          measurableActivities[] {
            _key,
            activityType,
            title,
            aim,
            order,
            targetDate,
            status,
            "reportingFrequency": coalesce(reportingFrequency, "n/a"),
            evidence,
            tasks[] | {
              _key,
              "task": coalesce(task, @),
              "priority": coalesce(priority, "medium"),
              "assignee": select(defined(assignee) => assignee->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName), staffId }, null),
              "inputs": select(defined(inputs) => inputs { file { asset->{ _id, url, originalFilename, size, mimeType } }, submittedAt }, null),
              "inputsReviewThread": select(defined(inputsReviewThread) => inputsReviewThread[] {
                _key,
                "author": author->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
                role,
                action,
                message,
                createdAt,
                file { asset->{ _id, url, originalFilename, size, mimeType } },
              }, []),
              "deliverableReviewThread": select(defined(deliverableReviewThread) => deliverableReviewThread[] {
                _key,
                "author": author->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
                role,
                action,
                message,
                createdAt,
                file { asset->{ _id, url, originalFilename, size, mimeType } },
              }, []),
              "status": coalesce(status, "to_do"),
              targetDate,
              "reportingFrequency": coalesce(reportingFrequency, "n/a"),
              expectedDeliverable,
              reportingPeriodStart,
              "periodDeliverables": select(defined(periodDeliverables) => periodDeliverables[] {
                _key,
                periodKey,
                "status": coalesce(status, "pending"),
                submittedAt,
                "deliverable": select(defined(deliverable) => deliverable[] {
                  _key,
                  file { asset->{ _id, url, originalFilename, size, mimeType } },
                  tag,
                  locked,
                }, []),
                "deliverableReviewThread": select(defined(deliverableReviewThread) => deliverableReviewThread[] {
                  _key,
                  "author": author->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
                  role,
                  action,
                  message,
                  createdAt,
                  file { asset->{ _id, url, originalFilename, size, mimeType } },
                }, []),
              }, []),
              "deliverable": select(defined(deliverable) => deliverable[] {
                _key,
                file { asset->{ _id, url, originalFilename, size, mimeType } },
                tag,
                locked,
              }, []),
            },
          },
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { sectionId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching section contract', error)
    return null
  }
}
