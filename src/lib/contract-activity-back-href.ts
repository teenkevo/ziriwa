import type { SectionAccess } from '@/lib/section-access'

/** Contract tab link for breadcrumbs / back navigation from an activity page. */
export function contractBackHrefForViewer(
  sectionAccess: SectionAccess,
  sectionSlug: string,
): string {
  if (
    sectionAccess.isSectionOfficer &&
    !sectionAccess.isSectionSupervisor &&
    !sectionAccess.isSectionManager
  ) {
    return '/officer/contract'
  }
  if (
    sectionAccess.isSectionSupervisor &&
    !sectionAccess.isSectionManager
  ) {
    return '/supervisor/contract'
  }
  const slug = sectionSlug.trim()
  return slug ? `/sections/${slug}` : '/departments'
}
