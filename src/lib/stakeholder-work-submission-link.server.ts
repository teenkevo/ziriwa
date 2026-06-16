import { writeClient } from '@/sanity/lib/write-client'

type EngagementScope = {
  sectionRef?: string
  projectRef?: string
  stakeholders?: { _key: string }[]
}

export async function resolveStakeholderIndexForSectionLink(input: {
  engagementId: string
  stakeholderKey: string
  sectionId: string
}): Promise<number> {
  const engagement = await writeClient.fetch<EngagementScope | null>(
    `*[_id == $engagementId && _type == "stakeholderEngagement"][0]{
      "sectionRef": section._ref,
      "projectRef": project._ref,
      stakeholders[]{ _key }
    }`,
    { engagementId: input.engagementId },
  )

  if (!engagement) {
    throw new Error('Stakeholder engagement not found')
  }

  const stakeholderIndex =
    engagement.stakeholders?.findIndex(
      stakeholder => stakeholder._key === input.stakeholderKey,
    ) ?? -1
  if (stakeholderIndex < 0) {
    throw new Error('Stakeholder not found')
  }

  if (engagement.sectionRef) {
    if (engagement.sectionRef !== input.sectionId) {
      throw new Error('Stakeholder engagement does not belong to this section')
    }
    return stakeholderIndex
  }

  if (engagement.projectRef) {
    const matchesWorkstream = await writeClient.fetch<boolean>(
      `count(*[_type == "section" && _id == $sectionId && project._ref == $projectId]) > 0`,
      { sectionId: input.sectionId, projectId: engagement.projectRef },
    )
    if (!matchesWorkstream) {
      throw new Error(
        'Stakeholder engagement does not belong to this project workstream',
      )
    }
    return stakeholderIndex
  }

  throw new Error('Invalid stakeholder engagement')
}

export async function linkStakeholderEntryToWorkSubmission(input: {
  engagementId: string
  stakeholderIndex: number
  sprintId: string
  taskKey: string
  submissionKey: string
}): Promise<void> {
  await writeClient
    .patch(input.engagementId)
    .set({
      [`stakeholders[${input.stakeholderIndex}].linkedWorkSubmission`]: {
        _type: 'stakeholderWorkSubmissionLink',
        sprint: { _type: 'reference', _ref: input.sprintId },
        taskKey: input.taskKey,
        submissionKey: input.submissionKey,
      },
    })
    .commit()
}
