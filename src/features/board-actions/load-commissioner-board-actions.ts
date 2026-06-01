import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import type { WorkContextMode } from '@/lib/section-access'
import {
  resolveCommissionerWorkspace,
  type CommissionerWorkspaceContext,
} from '@/lib/commissioner-workspace.server'
import { client } from '@/sanity/lib/client'

export type CommissionerDivisionOption = {
  _id: string
  name: string
}

export type CommissionerBoardActionRow = {
  _id: string
  title: string
  description?: string
  dueDate?: string
  status?: string
  divisionId?: string
  divisionName?: string
  sectionName?: string
}

export type CommissionerBoardActionsData = {
  commissionerWorkspace: CommissionerWorkspaceContext
  departmentName: string
  divisions: CommissionerDivisionOption[]
  actions: CommissionerBoardActionRow[]
}

async function getViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

export async function loadCommissionerBoardActionsData(options?: {
  workContext?: WorkContextMode
}): Promise<CommissionerBoardActionsData | null> {
  const commissionerWorkspace = await resolveCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!commissionerWorkspace) return null

  const departmentId = commissionerWorkspace.department._id
  const department = await client.fetch<{
    _id: string
    name: string
    divisions: CommissionerDivisionOption[]
  } | null>(
    /* groq */ `
      *[_type == "department" && _id == $departmentId][0]{
        _id,
        "name": coalesce(fullName, acronym, name),
        "divisions": *[_type == "division" && department._ref == ^._id] | order(coalesce(fullName, name) asc){
          _id,
          "name": coalesce(fullName, acronym, name)
        }
      }
    `,
    { departmentId },
  )

  if (!department?._id) return null

  const actions = await client.fetch<CommissionerBoardActionRow[]>(
    /* groq */ `
      *[_type == "boardAction" && department._ref == $departmentId] | order(dueDate asc, _createdAt desc) {
        _id,
        title,
        description,
        dueDate,
        status,
        "divisionId": division._ref,
        "divisionName": coalesce(division->fullName, division->acronym, division->name),
        "sectionName": section->name
      }
    `,
    { departmentId: department._id },
  )

  return {
    commissionerWorkspace,
    departmentName: department.name,
    divisions: department.divisions ?? [],
    actions: actions ?? [],
  }
}
