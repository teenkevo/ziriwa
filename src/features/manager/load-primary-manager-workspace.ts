import 'server-only'

import { notFound } from 'next/navigation'
import {
  getManagedSectionsForViewer,
  loadSectionWorkspaceData,
} from '@/features/sections/load-section-workspace-data'

export async function loadPrimaryManagerWorkspaceData() {
  const sections = await getManagedSectionsForViewer()
  const first = sections[0]
  if (!first) return null

  const sectionKey = first.slug?.current ?? first._id
  const data = await loadSectionWorkspaceData(sectionKey)
  if (!data) notFound()

  return data
}
