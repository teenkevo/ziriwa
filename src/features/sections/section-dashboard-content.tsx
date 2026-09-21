'use client'

import * as React from 'react'

import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

import { OverduePanel } from './components/dashboard/overdue-panel'
import { DashboardPulse } from './components/dashboard/dashboard-pulse'
import { DashboardInsights } from './components/dashboard/dashboard-insights'
import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import type { SectionAccess } from '@/lib/section-access'
import { scopeSprintsForViewer } from '@/lib/sprint-workspace-scope'
import {
  computeManagerSprintPulse,
  computeSupervisorSprintPulse,
  type CurrentWeekSprintPulse,
} from '@/lib/sprint-dashboard-pulse'
import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import { type WorkspaceBasePath } from '@/lib/workspace-paths'
import { useFinancialYear } from '@/contexts/financial-year-context'

interface SectionDashboardContentProps {
  sectionId?: string
  sectionName: string
  /** Used for overdue detailed task links to activity pages. */
  sectionSlug?: string
  contract: SectionContract | null
  /** Opens the matching section tab when the user picks an at-risk row. */
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
  sprints: WeeklySprint[]
  /** When set, sprint metrics and weekly report use only this viewer's sprints. */
  sectionAccess?: SectionAccess
  engagement: StakeholderEngagement | null
  today: string
  workspaceBasePath?: WorkspaceBasePath
  workspaceScope?: WorkspaceScopeKind
  /** Supervisors in the section — denominator for manager sprint planning. */
  supervisorCount?: number
}

export function SectionDashboardContent({
  sectionSlug,
  contract,
  sprints,
  sectionAccess,
  engagement,
  today,
  onNavigateToTab,
  workspaceBasePath = '/manager',
  supervisorCount = 0,
}: SectionDashboardContentProps) {
  const { active: activeFY } = useFinancialYear()
  const isSupervisorWorkspace = workspaceBasePath === '/supervisor'
  const isManagerView =
    (workspaceBasePath === '/manager' ||
      Boolean(sectionAccess?.isSectionManager)) &&
    !isSupervisorWorkspace

  const oversightSprints = React.useMemo(
    () =>
      sectionAccess ? scopeSprintsForViewer(sprints, sectionAccess) : sprints,
    [sprints, sectionAccess],
  )

  const metrics = React.useMemo(
    () =>
      computeSectionDashboardMetrics({
        contract,
        sprints: oversightSprints,
        engagement,
        today,
        financialYearLabel: activeFY.label,
      }),
    [contract, oversightSprints, engagement, today, activeFY.label],
  )

  const sprintPulse = React.useMemo((): CurrentWeekSprintPulse => {
    if (isManagerView) {
      return computeManagerSprintPulse({
        sprints,
        today,
        supervisorCount,
      })
    }
    return computeSupervisorSprintPulse({
      sprints: oversightSprints,
      today,
    })
  }, [isManagerView, sprints, oversightSprints, today, supervisorCount])

  const onOpenSprints = onNavigateToTab
    ? () => onNavigateToTab('weekly-sprint')
    : undefined
  const onOpenStakeholders = onNavigateToTab
    ? () => onNavigateToTab('stakeholder-engagements')
    : undefined

  return (
    <div className='space-y-8'>
      <div className='grid gap-6 lg:grid-cols-4 lg:items-stretch'>
        <div className='min-w-0 lg:col-span-3'>
          <OverduePanel
            upcomingActivities={metrics.upcomingActivities}
            upcomingPeriodDeliverables={metrics.upcomingPeriodDeliverables}
            overdueActivities={metrics.overdueActivities}
            overduePeriodDeliverables={metrics.overduePeriodDeliverables}
            pendingReviewTasks={metrics.pendingReviewTasks}
            revisionRequestedTasks={metrics.revisionRequestedTasks}
            lateEngagements={metrics.lateEngagements}
            sectionSlug={sectionSlug}
            onNavigateToTab={onNavigateToTab}
            workspaceBasePath={workspaceBasePath}
          />
        </div>
        <div className='min-w-0 lg:col-span-1'>
          <DashboardPulse pulse={sprintPulse} onOpenSprints={onOpenSprints} />
        </div>
      </div>

      <DashboardInsights
        metrics={metrics}
        onOpenStakeholders={onOpenStakeholders}
      />
    </div>
  )
}
