import 'server-only'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { getCommissionerDepartmentIdForViewer } from '@/lib/commissioner-department.server'
import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { getDepartmentContractByDepartment } from '@/sanity/lib/department-contracts/get-department-contract-by-department'
import { getDivisionContractByDivision } from '@/sanity/lib/division-contracts/get-division-contract-by-division'
import { getDeputyProjectContract } from '@/sanity/lib/project-contracts/get-deputy-project-contract'
import { getProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import { getProjectWorkstreamsForViewer } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getOfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import { isReleasedContractStatus } from '@/lib/contract-status'

function hasReleasedContract(
  contract: { status?: string | null } | null,
): boolean {
  return isReleasedContractStatus(contract?.status)
}

/**
 * Whether the viewer's active-year contract is finalized (or later).
 * Used to unlock sidebar destinations beyond Dashboard / Contract.
 */
export async function viewerHasActiveFyContract(): Promise<boolean> {
  const fyLabel = (await getActiveFinancialYear()).label
  const { isProjects, projectId } = await getProjectWorkspaceContext()

  if (isProjects && projectId) {
    const membership = await getProjectMembershipForViewer(projectId)
    if (!membership) return false

    if (membership.role === 'project_manager') {
      return hasReleasedContract(await getProjectContract(projectId, fyLabel))
    }
    if (membership.role === 'deputy_project_manager') {
      return hasReleasedContract(
        await getDeputyProjectContract(projectId, fyLabel),
      )
    }

    const workstreams = await getProjectWorkstreamsForViewer(projectId)
    const sectionId = workstreams[0]?._id
    if (!sectionId) return false
    const staffId = await getViewerStaffIdForSection(sectionId)
    if (!staffId) return false

    if (membership.role === 'workstream_lead') {
      return hasReleasedContract(
        await getSupervisorContract(sectionId, staffId, fyLabel),
      )
    }
    if (membership.role === 'workstream_member') {
      return hasReleasedContract(
        await getOfficerContract(sectionId, staffId, fyLabel),
      )
    }
    return false
  }

  const role = await getAppRole()

  if (role === 'commissioner') {
    const departmentId = await getCommissionerDepartmentIdForViewer()
    if (!departmentId) return false
    return hasReleasedContract(
      await getDepartmentContractByDepartment(departmentId, fyLabel),
    )
  }

  if (role === 'assistant_commissioner') {
    const division = await getAssistantCommissionerDivision()
    if (!division?._id) return false
    return hasReleasedContract(
      await getDivisionContractByDivision(division._id, fyLabel),
    )
  }

  const sections = await getManagedSectionsForViewer()
  const sectionId = sections[0]?._id
  if (!sectionId) return false

  const access = await getSectionAccessForViewer(sectionId, 'own')
  const staffId =
    access.viewerStaffId ?? (await getViewerStaffIdForSection(sectionId))

  if (access.isSectionOfficer || role === 'officer') {
    const officerId = access.officerContextStaffId ?? staffId
    if (!officerId) return false
    return hasReleasedContract(
      await getOfficerContract(sectionId, officerId, fyLabel),
    )
  }

  if (access.isSectionSupervisor || role === 'supervisor') {
    const supervisorId = access.supervisorContextStaffId ?? staffId
    if (!supervisorId) return false
    return hasReleasedContract(
      await getSupervisorContract(sectionId, supervisorId, fyLabel),
    )
  }

  if (access.isSectionManager || role === 'manager') {
    return hasReleasedContract(await getSectionContract(sectionId, fyLabel))
  }

  // Fallback: any section/supervisor/officer contract for this viewer
  const viewerStaffId = staffId ?? (await getViewerStaffId())
  if (viewerStaffId) {
    const [section, supervisor, officer] = await Promise.all([
      getSectionContract(sectionId, fyLabel),
      getSupervisorContract(sectionId, viewerStaffId, fyLabel),
      getOfficerContract(sectionId, viewerStaffId, fyLabel),
    ])
    return (
      hasReleasedContract(section) ||
      hasReleasedContract(supervisor) ||
      hasReleasedContract(officer)
    )
  }

  return hasReleasedContract(await getSectionContract(sectionId, fyLabel))
}
