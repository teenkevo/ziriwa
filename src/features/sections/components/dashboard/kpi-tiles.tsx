'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Zap,
  ListTodo,
  Handshake,
  CalendarClock,
} from 'lucide-react'

import type { SectionDashboardMetrics } from '@/lib/section-dashboard-metrics'

interface KpiTilesProps {
  metrics: SectionDashboardMetrics
}

function Tile({
  icon: Icon,
  label,
  value,
  subtle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  subtle?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className='p-4 space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-base '>{label}</span>
          <Icon className='h-4 w-4 text-muted-foreground' />
        </div>
        <div className='flex items-baseline gap-2'>
          <span className='text-2xl font-semibold tabular-nums'>{value}</span>
          {subtle && (
            <span className='text-xs text-muted-foreground'>{subtle}</span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function KpiTiles({ metrics }: KpiTilesProps) {
  const cp = metrics.contractProgress
  const active = metrics.activeSprint
  const engagement = metrics.stakeholderEngagement

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      <Tile
        icon={CheckCircle2}
        label='Contract progress'
        value={`${cp.percent}%`}
        subtle={`${cp.completed} / ${cp.total} activities completed`}
      >
        <Progress value={cp.percent} className='h-1.5' />
      </Tile>

      <Tile
        icon={Zap}
        label='Active sprint'
        value={active ? `${active.done}/${active.total}` : '—'}
        subtle={
          active
            ? `${active.weekLabel}${active.supervisorName ? ` · ${active.supervisorName}` : ''}`
            : 'No sprint for current week'
        }
      >
        {active && (
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
            <span>
              <span className='font-medium text-foreground'>
                {active.accepted}
              </span>{' '}
              accepted
            </span>
            <span>
              <span className='font-medium text-foreground'>{active.done}</span>{' '}
              done
            </span>
          </div>
        )}
      </Tile>

      <Tile
        icon={ListTodo}
        label='Open sprint tasks'
        value={metrics.openSprintTasks}
        subtle='across recent sprints'
      >
        {metrics.lastSprintWeekLabel && (
          <p className='text-xs text-muted-foreground inline-flex items-center gap-1'>
            <CalendarClock className='h-3 w-3' />
            Last sprint: {metrics.lastSprintWeekLabel}
            {metrics.lastSprintStatus &&
              ` · ${metrics.lastSprintStatus.replace('_', ' ')}`}
          </p>
        )}
      </Tile>

      <Tile
        icon={Handshake}
        label='Stakeholders this FY'
        value={engagement.total}
        subtle={
          engagement.total === 0
            ? 'No entries yet'
            : `${engagement.withReport} reported`
        }
      >
        {engagement.total > 0 && (
          <Progress
            value={Math.round((engagement.withReport / engagement.total) * 100)}
            className='h-1.5'
          />
        )}
      </Tile>
    </div>
  )
}
