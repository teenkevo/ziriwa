import 'server-only'

import { getViewerContext } from '@/lib/impersonation/viewer-context.server'

export async function getViewerStaffId(): Promise<string | null> {
  const ctx = await getViewerContext()
  return ctx.effectiveStaffId
}
