import 'server-only'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import type { SectionAccess } from '@/lib/section-access'

export async function getAssessmentAccessForSection(
  sectionId: string,
): Promise<{
  access: SectionAccess
  viewerStaffId: string | null
}> {
  const access = await getSectionAccessForViewer(sectionId)
  const viewerStaffId = await getViewerStaffId()
  return { access, viewerStaffId }
}

export function canManageAssessments(access: SectionAccess): boolean {
  return access.isSectionManager || access.isGlobalAdmin
}

export function canViewAssessmentResults(access: SectionAccess): boolean {
  return (
    access.isSectionManager ||
    access.isSectionSupervisor ||
    access.isGlobalAdmin
  )
}

export function canTakeAssessments(access: SectionAccess): boolean {
  return access.isSectionOfficer || access.isGlobalAdmin
}
