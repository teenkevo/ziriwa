import type { SectionAccess } from '@/lib/section-access'
import {
  getWorkspaceBasePathForAccess,
  getWorkspacePaths,
} from '@/lib/workspace-paths'

/** Contract tab link for breadcrumbs / back navigation from an activity page. */
export function contractBackHrefForViewer(
  sectionAccess: SectionAccess,
  sectionSlug: string,
): string {
  if (
    sectionAccess.isSectionOfficer ||
    sectionAccess.isSectionSupervisor ||
    sectionAccess.isSectionManager
  ) {
    const base = getWorkspaceBasePathForAccess(sectionAccess)
    return getWorkspacePaths(base).contract
  }

  const slug = sectionSlug.trim()
  return slug ? `/sections/${slug}?tab=contract` : '/departments'
}
