import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '../section-contracts/get-section-contract'

export type ProjectContract = {
  _id: string
  project?: { _id: string; name: string }
  financialYearLabel?: string
  projectManager?: { _id: string; fullName?: string }
  status?: string
  objectives?: SsmartaObjective[]
}

export type { ContractInitiative, SsmartaObjective }

export async function getProjectContract(
  projectId: string,
  financialYearLabel: string,
): Promise<ProjectContract | null> {
  const query = defineQuery(`
    *[_type == "projectContract" && project._ref == $projectId && financialYearLabel == $financialYearLabel][0] {
      _id,
      project->{ _id, name },
      financialYearLabel,
      projectManager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
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
              "status": coalesce(status, "to_do"),
              targetDate,
              "reportingFrequency": coalesce(reportingFrequency, "n/a"),
            },
          },
        },
      },
    }
  `)

  try {
    const contract = await sanityFetch({
      query,
      params: { projectId, financialYearLabel },
      revalidate: 0,
    })
    return contract || null
  } catch (error) {
    console.error('Error fetching project contract', error)
    return null
  }
}
