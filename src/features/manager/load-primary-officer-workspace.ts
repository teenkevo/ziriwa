import 'server-only'

import { notFound } from 'next/navigation'
import type { WorkContextMode } from '@/lib/section-access'
import {
  getManagedSectionsForViewer,
  loadSectionWorkspaceData,
} from '@/features/sections/load-section-workspace-data'

export async function loadPrimaryOfficerWorkspaceData(options?: {
  workContext?: WorkContextMode
}) {
  const sections = await getManagedSectionsForViewer()
  const first = sections[0]
  if (!first) return null

  const sectionKey = first.slug?.current ?? first._id
  const data = await loadSectionWorkspaceData(sectionKey, {
    workContext: options?.workContext,
  })
  if (!data) notFound()

  if (
    options?.workContext === 'acting' &&
    !data.sectionAccess.delegation.assignmentAsDelegatee
  ) {
    notFound()
  }

  return data
}
