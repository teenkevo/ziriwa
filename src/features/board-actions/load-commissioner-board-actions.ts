import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

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

export async function loadCommissionerBoardActionsData(): Promise<CommissionerBoardActionsData | null> {
  const email = await getViewerEmail()
  if (!email) return null

  const department = await client.fetch<{
    _id: string
    name: string
    divisions: CommissionerDivisionOption[]
  } | null>(
    /* groq */ `
      coalesce(
        *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]{
          _id,
          "name": coalesce(fullName, acronym, name),
          "divisions": *[_type == "division" && department._ref == ^._id] | order(coalesce(fullName, name) asc){
            _id,
            "name": coalesce(fullName, acronym, name)
          }
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department->{
          _id,
          "name": coalesce(fullName, acronym, name),
          "divisions": *[_type == "division" && department._ref == ^._id] | order(coalesce(fullName, name) asc){
            _id,
            "name": coalesce(fullName, acronym, name)
          }
        }
      )
    `,
    { email },
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
    departmentName: department.name,
    divisions: department.divisions ?? [],
    actions: actions ?? [],
  }
}
