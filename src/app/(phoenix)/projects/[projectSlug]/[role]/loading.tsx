import { Suspense } from 'react'

import { WorkContextRouteLoading } from '@/components/work-context-route-loading'
import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'

export default function Loading() {
  return (
    <Suspense fallback={<WorkspaceRouteLoading />}>
      <WorkContextRouteLoading />
    </Suspense>
  )
}
