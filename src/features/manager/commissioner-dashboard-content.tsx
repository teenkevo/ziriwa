'use client'

import * as React from 'react'
import Link from 'next/link'
import { Building2, FileText, Landmark, Target } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import type { CommissionerDashboardData } from './load-commissioner-dashboard'
import { CommissionerOverduePanel } from './commissioner-overdue-panel'

function MetricCard({
  href,
  icon: Icon,
  label,
  value,
  subtle,
  progress,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtle: string
  progress?: number
}) {
  return (
    <Link
      href={href}
      className='block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    >
      <Card className='h-full transition-colors hover:border-primary/60 hover:bg-muted/30'>
        <CardContent className='space-y-2 p-4'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-base'>{label}</span>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </div>
          <div className='flex items-baseline gap-2'>
            <span className='text-2xl font-semibold tabular-nums'>{value}</span>
            <span className='text-xs text-muted-foreground'>{subtle}</span>
          </div>
          {typeof progress === 'number' ? (
            <Progress value={progress} className='h-1.5' />
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}

export function CommissionerDashboardContent({
  data,
}: {
  data: CommissionerDashboardData
}) {
  const departmentHref = `/departments/${data.department.slug?.current ?? data.department._id}`
  const departmentName =
    data.department.fullName || data.department.acronym || data.department.name

  const breadcrumbs = React.useMemo(
    () => [
      { label: 'Commissioner', href: '/commissioner/dashboard' },
      { label: 'Dashboard' },
    ],
    [],
  )

  useRegisterPageBreadcrumbs(breadcrumbs)

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Dashboard</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Department contract progress, initiatives, and board actions for{' '}
            {departmentName}.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard
            href='/commissioner/contract'
            icon={FileText}
            label='Contract Progress'
            value={`${data.myContract.percent}%`}
            subtle={`${data.myContract.completed} / ${data.myContract.total} measurable activities completed`}
            progress={data.myContract.percent}
          />
          <MetricCard
            href='/commissioner/contract'
            icon={Target}
            label='Initiatives On Track'
            value={`${data.initiativeHealth.onTrack}/${data.initiativeHealth.total}`}
            subtle={`${data.initiativeHealth.atRisk} at risk • ${data.initiativeHealth.offTrack} off track`}
            progress={
              data.initiativeHealth.total === 0
                ? 0
                : Math.round(
                    (data.initiativeHealth.onTrack /
                      data.initiativeHealth.total) *
                      100,
                  )
            }
          />
          <MetricCard
            href={departmentHref}
            icon={Building2}
            label='Divisions'
            value={String(data.divisions.count)}
            subtle={`with ${data.divisions.sectionCount} ${
              data.divisions.sectionCount === 1 ? 'section' : 'sections'
            }`}
          />
          <MetricCard
            href='/commissioner/board-actions'
            icon={Landmark}
            label='Board Actions'
            value={String(data.boardActions.open)}
            subtle={`${data.boardActions.overdue} overdue • ${data.boardActions.completed} completed`}
            progress={
              data.boardActions.total === 0
                ? 0
                : Math.round(
                    (data.boardActions.completed / data.boardActions.total) *
                      100,
                  )
            }
          />
        </div>
        <CommissionerOverduePanel overdue={data.overdue} />
      </div>
    </div>
  )
}
