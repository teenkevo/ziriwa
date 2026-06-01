import 'server-only'

import type { WorkContextMode } from '@/lib/section-access'
import type { DelegationCandidate } from '@/lib/role-delegation'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getOrgDelegationCandidatesForStaff } from '@/lib/org-role-delegation-candidates.server'
import {
  getActiveOrgDelegationAsDelegatee,
  getOutgoingActiveOrgDelegation,
  syncOrgDelegationStatuses,
} from '@/lib/org-role-delegation.server'
import type { OrgDelegationRecord } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'

export type CommissionerDepartment = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current?: string }
}

export interface OrgDelegationState {
  assignmentAsDelegatee: OrgDelegationRecord | null
  assignmentAsAbsent: OrgDelegationRecord | null
}

export interface CommissionerWorkspaceContext {
  workContext: WorkContextMode
  department: CommissionerDepartment
  delegation: OrgDelegationState
  isPermanentCommissioner: boolean
  canSelfServiceDelegate: boolean
  delegationCandidates: DelegationCandidate[]
}

async function getDepartmentById(
  departmentId: string,
): Promise<CommissionerDepartment | null> {
  return client.fetch<CommissionerDepartment | null>(
    /* groq */ `*[_type == "department" && _id == $departmentId][0]{
      _id,
      "name": coalesce(acronym, fullName),
      fullName,
      acronym,
      slug
    }`,
    { departmentId },
  )
}

async function getCommissionerDepartmentByEmail(): Promise<CommissionerDepartment | null> {
  const user = await import('@clerk/nextjs/server').then(m => m.currentUser())
  const email = (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
  if (!email) return null

  return client.fetch<CommissionerDepartment | null>(
    /* groq */ `
      coalesce(
        *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department->{
          _id,
          "name": coalesce(acronym, fullName),
          fullName,
          acronym,
          slug
        }
      )
    `,
    { email },
  )
}

async function isPermanentCommissionerForDepartment(
  staffId: string,
  departmentId: string,
): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "department"
          && _id == $departmentId
          && (
            commissioner._ref == $staffId
            || *[
              _type == "staff"
              && _id == $staffId
              && role == "commissioner"
              && department._ref == $departmentId
            ][0]._id != null
          )
        ][0]
      ) > 0
    `,
    { staffId, departmentId },
  )
}

export async function resolveCommissionerWorkspace(
  workContext: WorkContextMode = 'own',
): Promise<CommissionerWorkspaceContext | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  if (workContext === 'acting') {
    const assignmentAsDelegatee = await getActiveOrgDelegationAsDelegatee(
      viewerStaffId,
      { actingRole: 'commissioner' },
    )
    if (!assignmentAsDelegatee?.departmentId) return null

    await syncOrgDelegationStatuses({
      departmentId: assignmentAsDelegatee.departmentId,
    })

    const department = await getDepartmentById(
      assignmentAsDelegatee.departmentId,
    )
    if (!department) return null

    return {
      workContext: 'acting',
      department,
      delegation: {
        assignmentAsDelegatee,
        assignmentAsAbsent: null,
      },
      isPermanentCommissioner: false,
      canSelfServiceDelegate: false,
      delegationCandidates: [],
    }
  }

  const department = await getCommissionerDepartmentByEmail()
  if (!department?._id) return null

  await syncOrgDelegationStatuses({ departmentId: department._id })

  const [isPermanentCommissioner, assignmentAsDelegatee, assignmentAsAbsent] =
    await Promise.all([
      isPermanentCommissionerForDepartment(viewerStaffId, department._id),
      getActiveOrgDelegationAsDelegatee(viewerStaffId, {
        departmentId: department._id,
      }),
      getOutgoingActiveOrgDelegation(viewerStaffId, {
        departmentId: department._id,
      }),
    ])

  const canSelfServiceDelegate =
    isPermanentCommissioner && !assignmentAsDelegatee && !assignmentAsAbsent
  const delegationCandidates = canSelfServiceDelegate
    ? await getOrgDelegationCandidatesForStaff(
        viewerStaffId,
        'department',
        department._id,
      )
    : []

  return {
    workContext: 'own',
    department,
    delegation: {
      assignmentAsDelegatee,
      assignmentAsAbsent,
    },
    isPermanentCommissioner,
    canSelfServiceDelegate,
    delegationCandidates,
  }
}

export async function canAccessCommissionerWorkspace(): Promise<boolean> {
  const role = await import('@/lib/clerk-app-role.server').then(m =>
    m.getAppRole(),
  )
  if (role === 'commissioner') return true

  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return false

  const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
    actingRole: 'commissioner',
  })
  return Boolean(acting)
}
