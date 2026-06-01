import 'server-only'

import type { WorkContextMode } from '@/lib/section-access'
import {
  resolveAssistantCommissionerWorkspace,
  type AssistantCommissionerWorkspaceContext,
} from '@/lib/assistant-commissioner-workspace.server'
import { client } from '@/sanity/lib/client'

export type AssistantBoardActionRow = {
  _id: string
  title: string
  dueDate?: string
  status?: string
  divisionId?: string
  divisionName?: string
  sectionId?: string
  sectionName?: string
}

export type AssistantSectionOption = {
  _id: string
  name: string
  divisionId: string
}

export type AssistantBoardActionsData = {
  acWorkspace: AssistantCommissionerWorkspaceContext
  divisionName: string
  actions: AssistantBoardActionRow[]
  sectionOptions: AssistantSectionOption[]
}

export async function loadAssistantCommissionerBoardActionsData(options?: {
  workContext?: WorkContextMode
}): Promise<AssistantBoardActionsData | null> {
  const acWorkspace = await resolveAssistantCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!acWorkspace) return null
  const division = acWorkspace.division
  if (!division?._id) return null

  const divisionName =
    division.fullName || division.acronym || division.name

  const [actions, sections] = await Promise.all([
    client.fetch<AssistantBoardActionRow[]>(
      /* groq */ `
        *[_type == "boardAction" && division._ref == $divisionId] | order(dueDate asc, _createdAt desc) {
          _id,
          title,
          dueDate,
          status,
          "divisionId": division._ref,
          "divisionName": coalesce(division->fullName, division->acronym, division->name),
          "sectionId": section._ref,
          "sectionName": section->name
        }
      `,
      { divisionId: division._id },
    ),
    client.fetch<AssistantSectionOption[]>(
      /* groq */ `
        *[_type == "section" && division._ref == $divisionId] | order(name asc) {
          _id,
          name,
          "divisionId": division._ref
        }
      `,
      { divisionId: division._id },
    ),
  ])

  return {
    acWorkspace,
    divisionName,
    actions: actions ?? [],
    sectionOptions: sections ?? [],
  }
}
