import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { client } from '@/sanity/lib/client'

export async function getBoardActionsViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

export async function getCommissionerBoardActionsContext(email: string) {
  return client.fetch<{
    departmentId: string | null
    staffId: string | null
  }>(
    /* groq */ `
      {
        "departmentId": coalesce(
          *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
          *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
          *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
        ),
        "staffId": *[_type == "staff" && lower(email) == $email && status == "active"][0]._id
      }
    `,
    { email },
  )
}

export async function getBoardActionDepartmentId(actionId: string) {
  return client.fetch<string | null>(
    /* groq */ `
      *[_type == "boardAction" && _id == $actionId][0].department._ref
    `,
    { actionId },
  )
}

export async function isDivisionInDepartment(
  divisionId: string,
  departmentId: string,
) {
  return client.fetch<boolean>(
    /* groq */ `
      count(*[_type == "division" && _id == $divisionId && department._ref == $departmentId]) > 0
    `,
    { divisionId, departmentId },
  )
}
