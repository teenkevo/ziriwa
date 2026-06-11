'use client'

import * as React from 'react'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import type { AssistantCommissionerDashboardData } from './load-assistant-commissioner-dashboard'
import { CommissionerOverduePanel } from './commissioner-overdue-panel'
import { MonthlyOversightCard, SplitMetricCard } from './monthly-oversight-card'
import { TeamVelocityCard } from './team-velocity-card'

export function AssistantCommissionerDashboardContent({
  data,
}: {
  data: AssistantCommissionerDashboardData
}) {
  const divisionName =
    data.division.fullName || data.division.acronym || data.division.name
  const { activeSprints } = data
  const soleActivitySection =
    activeSprints.sections.length === 1
      ? activeSprints.sections[0]
      : undefined
  const sprintCardHref = soleActivitySection
    ? `/sections/${soleActivitySection.sectionSlug ?? soleActivitySection.sectionId}?tab=weekly-sprint`
    : undefined

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
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Division contract progress, section sprints, and board actions for{' '}
            {divisionName}.
          </p>
        </div>

        <div className='grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SplitMetricCard
            href='/assistant-commissioner/contract'
            title='Contract'
            data={{
              periodLabel: data.contractOversight.periodLabel,
              total: data.contractOversight.total,
              subtitle: data.contractOversight.subtitle,
            }}
            columns={[
              // {
              //   label: 'Activities',
              //   value: data.contractOversight.breakdown.activities,
              // },
              {
                label: 'Activities At Risk',
                value: data.contractOversight.breakdown.atRisk,
              },
              {
                label: 'Activities On Track',
                value: data.contractOversight.breakdown.onTrack,
              },
            ]}
          />
          <MonthlyOversightCard
            href={sprintCardHref}
            data={data.weeklyOversight}
            breakdown={data.weeklyOversight.breakdown}
            title='Activities This week'
            weeklyReport={data.weeklyReport}
            breakdownLinks={{
              sprints: sprintCardHref,
              engagements: '/assistant-commissioner/stakeholder-engagements',
            }}
          />
          <MonthlyOversightCard
            data={data.monthlyOversight}
            breakdown={data.monthlyOversight.breakdown}
            href='/assistant-commissioner/stakeholder-engagements'
            breakdownLinks={{
              sprints: sprintCardHref,
              engagements: '/assistant-commissioner/stakeholder-engagements',
            }}
          />
          <SplitMetricCard
            href='/assistant-commissioner/board-actions'
            title='Board Actions'
            data={{
              periodLabel: data.boardActionsOversight.periodLabel,
              total: data.boardActionsOversight.total,
              subtitle: data.boardActionsOversight.subtitle,
            }}
            columns={[
              {
                label: 'Open',
                value: data.boardActionsOversight.breakdown.open,
              },
              {
                label: 'Overdue',
                value: data.boardActionsOversight.breakdown.overdue,
              },
              {
                label: 'Completed',
                value: data.boardActionsOversight.breakdown.completed,
              },
            ]}
          />
        </div>

        <CommissionerOverduePanel overdue={data.overdue} />

        <TeamVelocityCard
          sections={data.teamVelocity.sections}
          bySectionId={data.teamVelocity.bySectionId}
        />
      </div>
    </div>
  )
}
