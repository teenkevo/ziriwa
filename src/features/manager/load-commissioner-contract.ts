import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { canManageDepartmentContract, resolveCommissionerStaffRefForDepartment } from '@/lib/department-contract-access.server'
import { client } from '@/sanity/lib/client'
import { getDepartmentContractByDepartment } from '@/sanity/lib/department-contracts/get-department-contract-by-department'
import type { DepartmentContract } from '@/sanity/lib/department-contracts/get-department-contract'

export type CommissionerContractPageData = {
  department: {
    _id: string
    name: string
    fullName?: string
    acronym?: string
  }
  departmentContract: DepartmentContract | null
  commissioner: { _id: string; fullName: string } | null
  /** Sanity staff _id for POST / onboarding when coalesce commissioner doc was missing */
  commissionerStaffIdForOnboarding: string | null
  canManageContract: boolean
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

async function getCommissionerContext(email: string) {
  if (!email) return null

  return client.fetch<{
    department: CommissionerContractPageData['department']
    commissioner: { _id: string; fullName: string } | null
  } | null>(
    /* groq */ `
      {
        "department": coalesce(
          *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]{
            _id,
            "name": coalesce(fullName, acronym),
            fullName,
            acronym
          },
          *[
            _type == "department"
            && defined(commissioner)
            && commissioner._ref == *[
              _type == "staff"
              && lower(email) == $email
              && status == "active"
            ][0]._id
          ][0]{
            _id,
            "name": coalesce(fullName, acronym),
            fullName,
            acronym
          },
          *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department->{
            _id,
            "name": coalesce(fullName, acronym),
            fullName,
            acronym
          }
        ),
        "commissioner": coalesce(
          *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0].commissioner->{
            _id,
            "fullName": coalesce(fullName, firstName + " " + lastName)
          },
          *[
            _type == "department"
            && defined(commissioner)
            && commissioner._ref == *[
              _type == "staff"
              && lower(email) == $email
              && status == "active"
            ][0]._id
          ][0].commissioner->{
            _id,
            "fullName": coalesce(fullName, firstName + " " + lastName)
          },
          *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0]{
            _id,
            "fullName": coalesce(fullName, firstName + " " + lastName)
          }
        )
      }
    `,
    { email },
  )
}

export async function loadCommissionerContractPageData(): Promise<CommissionerContractPageData | null> {
  const email = await getViewerEmail()
  const ctx = await getCommissionerContext(email)
  if (!ctx?.department?._id) return null

  const [departmentContract, canManageContract, commissionerStaffIdForOnboarding] =
    await Promise.all([
      getDepartmentContractByDepartment(ctx.department._id),
      canManageDepartmentContract(ctx.department._id),
      resolveCommissionerStaffRefForDepartment(ctx.department._id),
    ])

  return {
    department: ctx.department,
    departmentContract,
    commissioner: ctx.commissioner,
    commissionerStaffIdForOnboarding,
    canManageContract,
  }
}
