'use client'

import { OverduePanel } from '@/features/sections/components/dashboard/overdue-panel'
import type { AcFocusItems } from './load-assistant-commissioner-dashboard'

export function AssistantCommissionerFocusPanel({
  focusItems,
}: {
  focusItems: AcFocusItems
}) {
  return (
    <OverduePanel
      upcomingActivities={focusItems.upcomingActivities}
      upcomingPeriodDeliverables={focusItems.upcomingPeriodDeliverables}
      overdueActivities={focusItems.overdueActivities}
      overduePeriodDeliverables={focusItems.overduePeriodDeliverables}
      pendingReviewTasks={focusItems.pendingReviewTasks}
      revisionRequestedTasks={focusItems.revisionRequestedTasks}
      lateEngagements={focusItems.lateEngagements}
      workspaceBasePath='/assistant-commissioner'
      showOwningParty
    />
  )
}
