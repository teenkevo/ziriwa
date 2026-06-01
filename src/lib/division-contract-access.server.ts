import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { client } from '@/sanity/lib/client'

function getViewerEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

export async function getDivisionIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "divisionContract" && _id == $contractId][0].division._ref`,
    { contractId },
  )
}

export async function resolveAssistantCommissionerStaffRefForDivision(
  divisionId: string,
): Promise<string | null> {
  const user = await currentUser()
  const email = getViewerEmail(user)
  if (!email) return null

  return client.fetch<string | null>(
    /* groq */ `
      *[
        _type == "staff"
        && lower(email) == $email
        && coalesce(status, "active") != "inactive"
        && (
          (role == "assistant_commissioner" && division._ref == $divisionId)
          || _id == *[_type == "division" && _id == $divisionId][0].assistantCommissioner._ref
        )
      ][0]._id
    `,
    { email, divisionId },
  )
}

export async function canManageDivisionContract(
  divisionId: string,
): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false

  const appRole = await getAppRole()
  if ((await isSuperadmin()) || appRole === 'commissioner_general') return true

  const email = getViewerEmail(user)
  if (!email) return false

  const acActive =
    '!defined(assistantCommissioner->status) || assistantCommissioner->status == "active"'

  const allowed = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "division"
          && _id == $divisionId
          && (
            (
              (${acActive})
              && (
                lower(assistantCommissioner->email) == $email
                || assistantCommissioner._ref == *[
                  _type == "staff"
                  && lower(email) == $email
                  && coalesce(status, "active") != "inactive"
                ][0]._id
              )
            )
            || count(
              *[
                _type == "staff"
                && lower(email) == $email
                && coalesce(status, "active") != "inactive"
                && role == "assistant_commissioner"
                && division._ref == $divisionId
              ]
            ) > 0
          )
        ][0]
      ) > 0
    `,
    { divisionId, email },
  )

  if (allowed) return true

  if (appRole === 'assistant_commissioner') {
    const resolved =
      await resolveAssistantCommissionerStaffRefForDivision(divisionId)
    if (resolved) return true
  }

  return false
}

export function divisionContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertDivisionContractManageAllowed(
  divisionId: string,
): Promise<NextResponse | null> {
  if (await canManageDivisionContract(divisionId)) return null
  return divisionContractAccessDenied(
    'Only the division assistant commissioner can change this contract',
  )
}
