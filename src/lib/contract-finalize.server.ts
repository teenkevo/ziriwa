import 'server-only'

import { NextResponse } from 'next/server'

import { shareFinalizedAssignments } from '@/lib/contract-cascade/assign-measurable-activity.server'
import { getUnreleasedCascadeKeys } from '@/lib/contract-cascade-visibility'
import {
  reviewContractForFinalize,
  type ContractFinalizeIssue,
  type ContractFinalizeObjective,
} from '@/lib/contract-finalize'
import { isWorkspaceFinancialYearWritable } from '@/lib/financial-year-access.server'
import { canManageDepartmentContract } from '@/lib/department-contract-access.server'
import { canManageDeputyProjectContract } from '@/lib/deputy-project-contract-access.server'
import { canManageDivisionContract } from '@/lib/division-contract-access.server'
import { canManageOfficerContract } from '@/lib/officer-contract-access.server'
import { canManageProjectContract } from '@/lib/project-contract-access.server'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import { canManageSupervisorContract } from '@/lib/supervisor-contract-access.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

const FINALIZED_MESSAGE =
  'This contract is finalized and can no longer be edited.'

export async function rejectFinalizedContractMutation(
  contractId: string,
): Promise<NextResponse | null> {
  const status = await client.fetch<string | null>(
    /* groq */ `*[_id == $contractId][0].status`,
    { contractId },
  )
  if (status !== 'finalized') return null
  return NextResponse.json({ error: FINALIZED_MESSAGE }, { status: 409 })
}

export async function canFinalizeContract(input: {
  _type?: string
  sectionId?: string
  divisionId?: string
  departmentId?: string
  projectId?: string
  officerId?: string
}): Promise<boolean> {
  if (!(await isWorkspaceFinancialYearWritable())) return false
  switch (input._type) {
    case 'sectionContract':
      if (!input.sectionId) return false
      return (await getSectionAccessForViewer(input.sectionId)).canManageContract
    case 'supervisorContract':
      if (!input.sectionId) return false
      return canManageSupervisorContract(input.sectionId)
    case 'officerContract':
      if (!input.sectionId) return false
      return canManageOfficerContract(input.sectionId, input.officerId)
    case 'divisionContract':
      if (!input.divisionId) return false
      return canManageDivisionContract(input.divisionId)
    case 'departmentContract':
      if (!input.departmentId) return false
      return canManageDepartmentContract(input.departmentId)
    case 'projectContract':
      if (!input.projectId) return false
      return canManageProjectContract(input.projectId)
    case 'deputyProjectContract':
      if (!input.projectId) return false
      return canManageDeputyProjectContract(input.projectId)
    default:
      return false
  }
}

export async function finalizeContract(contractId: string): Promise<
  | { ok: true; warnings: string[] }
  | { ok: false; status: number; error: string; blockers?: ContractFinalizeIssue[] }
> {
  const contract = await client.fetch<{
    _type?: string
    status?: string
    sectionId?: string
    divisionId?: string
    departmentId?: string
    projectId?: string
    officerId?: string
    objectives?: ContractFinalizeObjective[]
  } | null>(
    /* groq */ `*[_id == $contractId][0]{
      _type,
      status,
      "sectionId": section._ref,
      "divisionId": division._ref,
      "departmentId": department._ref,
      "projectId": project._ref,
      "officerId": officer._ref,
      objectives[]{
        _key,
        code,
        title,
        cascadeKind,
        initiatives[]{
          _key,
          code,
          title,
          cascadeKind,
          measurableActivities[]{
            _key,
            title,
            activityType,
            targetDate,
            "assignees": assignees[]->{ _id },
            evidence
          }
        }
      }
    }`,
    { contractId },
  )
  if (!contract?._type) {
    return { ok: false, status: 404, error: 'Contract not found' }
  }
  if (!(await canFinalizeContract(contract))) {
    return {
      ok: false,
      status: 403,
      error: 'You cannot finalize this contract.',
    }
  }
  if (contract.status === 'finalized') {
    return { ok: false, status: 409, error: 'This contract is already finalized.' }
  }

  const unreleased = await getUnreleasedCascadeKeys(contractId)
  const blockers = reviewContractForFinalize(
    contract.objectives,
    unreleased.hiddenKeys,
  ).filter(issue => issue.severity === 'blocker')
  if (blockers.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'Resolve the listed items before finalizing.',
      blockers,
    }
  }

  const warnings = await shareFinalizedAssignments(contractId)
  await writeClient.patch(contractId).set({ status: 'finalized' }).commit()
  return { ok: true, warnings }
}
