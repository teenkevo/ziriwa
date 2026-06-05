import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'
import type { ProjectContract } from './get-project-contract'

export type DeputyProjectContract = ProjectContract & {
  deputyProjectManager?: { _id: string; fullName?: string }
}

export async function getDeputyProjectContract(
  projectId: string,
  financialYearLabel: string,
): Promise<DeputyProjectContract | null> {
  const query = defineQuery(`
    *[_type == "deputyProjectContract" && project._ref == $projectId && financialYearLabel == $financialYearLabel][0] {
      _id,
      project->{ _id, name },
      financialYearLabel,
      deputyProjectManager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
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
    console.error('Error fetching deputy project contract', error)
    return null
  }
}
