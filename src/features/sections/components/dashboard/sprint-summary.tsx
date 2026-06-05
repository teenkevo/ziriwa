'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { StatusDonut, type DonutSlice } from './status-donut'

import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import type { SectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import { getDashboardActivityCategoryKeys } from '@/lib/sprint-task-validation'

const TASK_STATUS_COLORS: Record<string, { label: string; color: string }> = {
  to_do: { label: 'To do', color: 'hsl(215 16% 65%)' },
  in_progress: { label: 'In progress', color: 'hsl(217 91% 60%)' },
  delivered: { label: 'Delivered', color: 'hsl(262 73% 64%)' },
  in_review: { label: 'In review', color: 'hsl(38 92% 50%)' },
  done: { label: 'Done', color: 'hsl(142 71% 45%)' },
}

const CATEGORY_COLORS: Record<string, { label: string; color: string }> = {
  normal_flow: { label: 'Normal flow', color: 'hsl(217 91% 60%)' },
  compliance: { label: 'Compliance', color: 'hsl(330 65% 48%)' },
  staff_development: {
    label: 'Staff development',
    color: 'hsl(262 73% 64%)',
  },
  stakeholder_engagement: {
    label: 'Stakeholder engagement',
    color: 'hsl(38 92% 50%)',
  },
  software_development: {
    label: 'Software development',
    color: 'hsl(199 89% 48%)',
  },
  data_management: {
    label: 'Data management',
    color: 'hsl(173 58% 39%)',
  },
  change_management: {
    label: 'Change management',
    color: 'hsl(291 64% 42%)',
  },
  uat_pilot: { label: 'UAT / Pilot', color: 'hsl(24 95% 53%)' },
  emergency: { label: 'Emergency', color: 'hsl(0 72% 51%)' },
  uncategorized: { label: 'Uncategorized', color: 'hsl(215 16% 65%)' },
}

interface SprintSummaryProps {
  metrics: SectionDashboardMetrics
  workspaceScope?: WorkspaceScopeKind
}

export function SprintSummary({
  metrics,
  workspaceScope = 'mainstream',
}: SprintSummaryProps) {
  const dashboardCategoryKeys = React.useMemo(
    () => getDashboardActivityCategoryKeys(workspaceScope),
    [workspaceScope],
  )
  const trendChartConfig = React.useMemo<ChartConfig>(
    () => ({
      doneTasks: { label: 'Done', color: 'hsl(142 71% 45%)' },
      acceptedTasks: { label: 'Accepted', color: 'hsl(217 91% 60%)' },
    }),
    [],
  )

  const trendData = React.useMemo(
    () =>
      metrics.weeklyTrend.map(p => ({
        // Shorter label for the axis tick
        weekShort:
          p.weekLabel.replace(/Week\s+/i, 'W').replace(/\s+\d{4}$/, '') ||
          p.weekLabel,
        weekLabel: p.weekLabel,
        doneTasks: p.doneTasks,
        acceptedTasks: p.acceptedTasks,
      })),
    [metrics.weeklyTrend],
  )

  const taskStatusLegendSlices: DonutSlice[] = React.useMemo(
    () =>
      (
        Object.entries(TASK_STATUS_COLORS) as [
          keyof typeof TASK_STATUS_COLORS,
          (typeof TASK_STATUS_COLORS)[keyof typeof TASK_STATUS_COLORS],
        ][]
      ).map(([k, meta]) => ({
        key: k,
        label: meta.label,
        value:
          metrics.taskStatusBreakdown[
            k as keyof typeof metrics.taskStatusBreakdown
          ] ?? 0,
        color: meta.color,
      })),
    [metrics.taskStatusBreakdown],
  )

  const taskStatusSlices: DonutSlice[] = React.useMemo(
    () => taskStatusLegendSlices.filter(s => s.value > 0),
    [taskStatusLegendSlices],
  )

  const categoryLegendSlices: DonutSlice[] = React.useMemo(
    () =>
      dashboardCategoryKeys.map(k => {
        const meta = CATEGORY_COLORS[k]
        return {
          key: k,
          label: meta?.label ?? k,
          value:
            metrics.activityCategoryBreakdown[
              k as keyof typeof metrics.activityCategoryBreakdown
            ] ?? 0,
          color: meta?.color ?? CATEGORY_COLORS.uncategorized.color,
        }
      }),
    [dashboardCategoryKeys, metrics.activityCategoryBreakdown],
  )

  const categorySlices: DonutSlice[] = React.useMemo(
    () => categoryLegendSlices.filter(s => s.value > 0),
    [categoryLegendSlices],
  )

  const totalTaskStatus = React.useMemo(
    () => Object.values(metrics.taskStatusBreakdown).reduce((a, b) => a + b, 0),
    [metrics.taskStatusBreakdown],
  )

  const totalCategory = React.useMemo(
    () =>
      categoryLegendSlices.reduce(
        (sum, slice) => sum + slice.value,
        0,
      ),
    [categoryLegendSlices],
  )

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Sprints</CardTitle>
        <CardDescription>
          Execution trend and team load across the last{' '}
          {metrics.weeklyTrend.length} week
          {metrics.weeklyTrend.length === 1 ? '' : 's'}.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='space-y-2'>
          <div className='text-sm font-medium'>Tasks per week</div>
          {trendData.length === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              No sprints submitted yet.
            </p>
          ) : (
            <ChartContainer
              config={trendChartConfig}
              className='h-[200px] w-full'
            >
              <BarChart data={trendData} margin={{ top: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='weekShort'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey='acceptedTasks'
                  fill='var(--color-acceptedTasks)'
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey='doneTasks'
                  fill='var(--color-doneTasks)'
                  radius={[2, 2, 0, 0]}
                >
                  <LabelList
                    dataKey='doneTasks'
                    position='top'
                    className='fill-foreground text-xs'
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>Task status</div>
            <StatusDonut
              slices={taskStatusSlices}
              legendSlices={taskStatusLegendSlices}
              totalLabel='tasks'
              totalValue={totalTaskStatus}
            />
          </div>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>Activity category</div>
            <StatusDonut
              slices={categorySlices}
              legendSlices={categoryLegendSlices}
              totalLabel='tasks'
              totalValue={totalCategory}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <div className='text-sm font-medium'>Officer load</div>
          {metrics.officerLoad.length === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              No officers assigned in recent sprints.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left text-xs text-muted-foreground'>
                    <th className='py-1 pr-3 font-medium'>Officer</th>
                    <th className='py-1 px-3 font-medium tabular-nums'>
                      Active
                    </th>
                    <th className='py-1 px-3 font-medium tabular-nums'>
                      Done this month
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.officerLoad.map(o => (
                    <tr key={o.staffId} className='border-t border-border/60'>
                      <td className='py-1.5 pr-3 truncate'>{o.fullName}</td>
                      <td className='py-1.5 px-3 tabular-nums'>{o.active}</td>
                      <td className='py-1.5 px-3 tabular-nums'>
                        {o.doneThisMonth}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
