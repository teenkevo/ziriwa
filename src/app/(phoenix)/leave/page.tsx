import { startOfMonth } from 'date-fns'

import { LeavePageContent } from '@/features/leave/leave-page-content'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { toDateKey, visibleMonthBounds } from '@/lib/leave/dates'
import {
  listLeaveEntitlements,
  listLeavePlans,
  listOwnLeavePlans,
  listReliefStaffOptions,
} from '@/lib/leave/leave-plans.server'

export default async function LeavePage() {
  const viewer = await getViewerContext()
  const month = startOfMonth(new Date())
  const bounds = visibleMonthBounds(month)
  const [plans, relief, entitlements, ownPlans] = viewer.effectiveStaffId
    ? await Promise.all([
        listLeavePlans(bounds.from, bounds.to),
        listReliefStaffOptions(viewer.effectiveStaffId),
        listLeaveEntitlements(viewer.effectiveStaffId, bounds.from, bounds.to),
        listOwnLeavePlans(viewer.effectiveStaffId),
      ])
    : [[], { options: [], hint: '' }, [], []]

  return (
    <LeavePageContent
      viewerStaffId={viewer.effectiveStaffId}
      viewerName={viewer.effectiveName}
      initialMonth={toDateKey(month)}
      initialPlans={plans}
      reliefOptions={relief.options}
      reliefHint={relief.hint}
      initialEntitlements={entitlements}
      initialOwnPlans={ownPlans}
    />
  )
}
