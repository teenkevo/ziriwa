import type { SectionAccess } from '@/lib/section-access'
import {
  getWorkspaceBasePathForAccess,
  getWorkspacePaths,
} from '@/lib/workspace-paths'

/**
 * Remember which contract columns were open when leaving for an initiative.
 * Row ids match the column browser (`_key`, or the index fallback).
 */
export function withContractChainHref(
  href: string,
  chain: {
    objectiveId: string
    initiativeId: string
    activityId?: string
  },
): string {
  const hashIndex = href.indexOf('#')
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const params = new URLSearchParams(
    queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '',
  )
  params.set('chainObjective', chain.objectiveId)
  params.set('chainInitiative', chain.initiativeId)
  const activityId = chain.activityId?.trim()
  if (activityId) params.set('chainActivity', activityId)
  const query = params.toString()
  return `${path}${query ? `?${query}` : ''}${hash}`
}

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

/** Weekly sprints link aligned with each role's sidebar (officer / supervisor / manager). */
export function sprintsHrefForViewer(
  sectionAccess: SectionAccess,
  sectionSlug: string,
): string {
  if (
    sectionAccess.isSectionOfficer ||
    sectionAccess.isSectionSupervisor ||
    sectionAccess.isSectionManager
  ) {
    const base = getWorkspaceBasePathForAccess(sectionAccess)
    return getWorkspacePaths(base).sprintsReady
  }

  const slug = sectionSlug.trim()
  return slug ? `/sections/${slug}?tab=weekly-sprint` : '/departments'
}
