'use client'

import * as React from 'react'
import { Pie, PieChart, Cell, Label } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export type DonutSlice = {
  key: string
  label: string
  value: number
  color: string
}

interface StatusDonutProps {
  slices: DonutSlice[]
  totalLabel?: string
  totalValue?: number | string
  className?: string
  hideLegend?: boolean
}

/**
 * Generic donut chart wrapped with the shadcn ChartContainer so colors/typography
 * match the rest of the app. Pass pre-computed slices to keep the component
 * presentational and reusable across the dashboard.
 */
export function StatusDonut({
  slices,
  totalLabel = 'Total',
  totalValue,
  className,
  hideLegend = false,
}: StatusDonutProps) {
  const sum = React.useMemo(
    () => slices.reduce((acc, s) => acc + s.value, 0),
    [slices],
  )

  const config = React.useMemo<ChartConfig>(() => {
    const out: ChartConfig = {}
    for (const slice of slices) {
      out[slice.key] = { label: slice.label, color: slice.color }
    }
    return out
  }, [slices])

  if (sum === 0) {
    return (
      <div
        className={cn(
          'flex h-[180px] items-center justify-center text-sm text-muted-foreground',
          className,
        )}
      >
        No data yet
      </div>
    )
  }

  const resolvedTotal = totalValue ?? sum

  return (
    <ChartContainer
      config={config}
      className={cn('mx-auto aspect-square max-h-[220px]', className)}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey='label' />}
        />
        <Pie
          data={slices}
          dataKey='value'
          nameKey='label'
          innerRadius={55}
          strokeWidth={2}
        >
          {slices.map(slice => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor='middle'
                    dominantBaseline='middle'
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className='fill-foreground text-2xl font-bold'
                    >
                      {resolvedTotal}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 18}
                      className='fill-muted-foreground text-xs'
                    >
                      {totalLabel}
                    </tspan>
                  </text>
                )
              }
              return null
            }}
          />
        </Pie>
        {!hideLegend && (
          <ChartLegend
            content={<ChartLegendContent nameKey='label' />}
            verticalAlign='bottom'
          />
        )}
      </PieChart>
    </ChartContainer>
  )
}
