import 'server-only'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getViewerStaffIdForSection } from '@/lib/get-viewer-staff-for-section'
import { getEffectiveViewerEmail } from '@/lib/impersonation/viewer-context.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { client } from '@/sanity/lib/client'
import { getDepartmentContractByDepartment } from '@/sanity/lib/department-contracts/get-department-contract-by-department'
import { getDivisionContractByDivision } from '@/sanity/lib/division-contracts/get-division-contract-by-division'
import { getDeputyProjectContract } from '@/sanity/lib/project-contracts/get-deputy-project-contract'
import { getProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import { getProjectWorkstreamsForViewer } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getOfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { getSectionAccessForViewer } from '@/lib/section-access.server'

/**
 * Whether the viewer already has a contract for the active financial year.
 * Used to unlock sidebar destinations beyond Dashboard / Contract.
 */
export async function viewerHasActiveFyContract(): Promise<boolean> {
  const fyLabel = (await getActiveFinancialYear()).label
  const { isProjects, projectId } = await getProjectWorkspaceContext()

  if (isProjects && projectId) {
    const membership = await getProjectMembershipForViewer(projectId)
    if (!membership) return false

    if (membership.role === 'project_manager') {
      return Boolean(await getProjectContract(projectId, fyLabel))
    }
    if (membership.role === 'deputy_project_manager') {
      return Boolean(await getDeputyProjectContract(projectId, fyLabel))
    }

    const workstreams = await getProjectWorkstreamsForViewer(projectId)
    const sectionId = workstreams[0]?._id
    if (!sectionId) return false
    const staffId = await getViewerStaffIdForSection(sectionId)
    if (!staffId) return false

    if (membership.role === 'workstream_lead') {
      return Boolean(
        await getSupervisorContract(sectionId, staffId, fyLabel),
      )
    }
    if (membership.role === 'workstream_member') {
      return Boolean(await getOfficerContract(sectionId, staffId, fyLabel))
    }
    return false
  }

  const role = await getAppRole()

  if (role === 'commissioner') {
    const email = await getEffectiveViewerEmail()
    if (!email) return false
    const departmentId = await client.fetch<string | null>(
      /* groq */ `
        coalesce(
          *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
          *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
          *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
        )
      `,
      { email },
    )
    if (!departmentId) return false
    return Boolean(
      await getDepartmentContractByDepartment(departmentId, fyLabel),
    )
  }

  if (role === 'assistant_commissioner') {
    const division = await getAssistantCommissionerDivision()
    if (!division?._id) return false
    return Boolean(await getDivisionContractByDivision(division._id, fyLabel))
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
    return Boolean(await getOfficerContract(sectionId, officerId, fyLabel))
  }

  if (access.isSectionSupervisor || role === 'supervisor') {
    const supervisorId = access.supervisorContextStaffId ?? staffId
    if (!supervisorId) return false
    return Boolean(
      await getSupervisorContract(sectionId, supervisorId, fyLabel),
    )
  }

  if (access.isSectionManager || role === 'manager') {
    return Boolean(await getSectionContract(sectionId, fyLabel))
  }

  // Fallback: any section/supervisor/officer contract for this viewer
  const viewerStaffId = staffId ?? (await getViewerStaffId())
  if (viewerStaffId) {
    const [section, supervisor, officer] = await Promise.all([
      getSectionContract(sectionId, fyLabel),
      getSupervisorContract(sectionId, viewerStaffId, fyLabel),
      getOfficerContract(sectionId, viewerStaffId, fyLabel),
    ])
    return Boolean(section || supervisor || officer)
  }

  return Boolean(await getSectionContract(sectionId, fyLabel))
}
