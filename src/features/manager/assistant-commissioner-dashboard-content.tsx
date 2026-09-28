'use client'

import * as React from 'react'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import type { AssistantCommissionerDashboardData } from './load-assistant-commissioner-dashboard'
import { AssistantCommissionerActionTracker } from './assistant-commissioner-action-tracker'
import { AssistantCommissionerFocusPanel } from './assistant-commissioner-focus-panel'
import { AssistantCommissionerSectionSprintPanel } from './assistant-commissioner-section-sprint-panel'
import { TeamVelocityCard } from './team-velocity-card'

export function AssistantCommissionerDashboardContent({
  data,
}: {
  data: AssistantCommissionerDashboardData
}) {
  const sprintWeekLabel =
    data.sectionSprintMetrics.find(r => r.weekLabel)?.weekLabel ??
    data.weeklyOversight.periodLabel

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: 'Assistant Commissioner',
          href: '/assistant-commissioner/dashboard',
        },
        { label: 'Dashboard' },
      ],
      [],
    ),
  )

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Dashboard</h1>
        </div>

        <div className='grid gap-6 lg:grid-cols-4 lg:items-start'>
          <div className='min-w-0 lg:col-span-3'>
            <AssistantCommissionerFocusPanel focusItems={data.focusItems} />
          </div>
          <div className='min-w-0 lg:col-span-1'>
            <AssistantCommissionerSectionSprintPanel
              rows={data.sectionSprintMetrics}
              weekLabel={sprintWeekLabel}
            />
          </div>
        </div>

        <AssistantCommissionerActionTracker items={data.actionTracker.items} />

        <TeamVelocityCard
          sections={data.teamVelocity.sections}
          bySectionId={data.teamVelocity.bySectionId}
        />
      </div>
    </div>
  )
}
