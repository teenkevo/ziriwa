import { Suspense } from 'react'

import { WorkContextRouteLoading } from '@/components/work-context-route-loading'

export default function Loading() {
  return (
    <Suspense fallback={null}>
      <WorkContextRouteLoading />
    </Suspense>
  )
}
