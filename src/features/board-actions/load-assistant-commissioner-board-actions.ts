import 'server-only'

import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
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
  divisionName: string
  actions: AssistantBoardActionRow[]
  sectionOptions: AssistantSectionOption[]
}

export async function loadAssistantCommissionerBoardActionsData(): Promise<AssistantBoardActionsData | null> {
  const division = await getAssistantCommissionerDivision()
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
    divisionName,
    actions: actions ?? [],
    sectionOptions: sections ?? [],
  }
}
