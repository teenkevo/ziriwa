'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SprintVelocitySummary } from '@/lib/sprint-velocity'

export type TeamVelocitySectionOption = {
  id: string
  name: string
  slug?: string
}

export function TeamVelocityCard({
  sections,
  bySectionId,
  defaultWeekCount = 7,
}: {
  sections: TeamVelocitySectionOption[]
  bySectionId: Record<string, SprintVelocitySummary>
  defaultWeekCount?: number
}) {
  const [sectionId, setSectionId] = React.useState(sections[0]?.id ?? '')

  React.useEffect(() => {
    if (sections.length === 0) {
      setSectionId('')
      return
    }
    if (!sections.some(section => section.id === sectionId)) {
      setSectionId(sections[0].id)
    }
  }, [sections, sectionId])

  const summary = sectionId ? bySectionId[sectionId] : undefined
  const chartData = summary?.weeks ?? []

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      committed: {
        label: 'Committed',
        color: 'hsl(199 89% 74%)',
      },
      fulfilled: {
        label: 'Fulfilled',
        color: 'hsl(217 91% 45%)',
      },
    }),
    [],
  )

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Team velocity</CardTitle>
        <CardDescription>
          Sprint tasks committed vs fulfilled — last {defaultWeekCount} weeks
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {sections.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No sections in this division yet.
          </p>
        ) : (
          <>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <label className='text-sm font-medium' htmlFor='team-velocity-section'>
                Section
              </label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger
                  id='team-velocity-section'
                  className='w-full sm:w-[280px]'
                >
                  <SelectValue placeholder='Select section' />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ChartContainer config={chartConfig} className='h-[280px] w-full'>
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                barGap={2}
                barCategoryGap='18%'
              >
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis
                  dataKey='weekShort'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={-25}
                  textAnchor='end'
                  height={56}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickMargin={8}
                  label={{
                    value: 'Tasks',
                    angle: -90,
                    position: 'insideLeft',
                    className: 'fill-muted-foreground text-xs',
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as
                          | SprintVelocitySummary['weeks'][number]
                          | undefined
                        if (!row) return ''
                        return row.hasSprint
                          ? row.weekLabel
                          : `${row.weekLabel} (no sprint)`
                      }}
                    />
                  }
                />
                <Bar
                  dataKey='committed'
                  fill='var(--color-committed)'
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey='fulfilled'
                  fill='var(--color-fulfilled)'
                  radius={[2, 2, 0, 0]}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
