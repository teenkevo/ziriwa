'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CalendarClock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export type DueItem = {
  _key: string
  title: string
  targetDate?: string
  status?: string
  objectiveTitle?: string
  initiativeTitle?: string
  activityTitle?: string
}

function DueCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
  highlight,
}: {
  title: string
  icon: typeof Calendar
  items: DueItem[]
  emptyMessage: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Icon className='h-4 w-4' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        {items.length === 0 ? (
          <p className='text-xs text-muted-foreground'>{emptyMessage}</p>
        ) : (
          <ul className='space-y-2'>
            {items.map(item => (
              <li
                key={item._key}
                className={`text-sm border-l-2 pl-2 ${highlight ? 'border-primary' : 'border-muted'}`}
              >
                <span className='font-medium'>{item.title}</span>
                {item.targetDate && (
                  <span className='ml-1 text-xs text-muted-foreground'>
                    {format(parseISO(item.targetDate), 'EEE, MMM d')}
                  </span>
                )}
                {(item.activityTitle || item.initiativeTitle) && (
                  <span className='ml-1 text-xs text-muted-foreground'>
                    ({[item.activityTitle, item.initiativeTitle].filter(Boolean).join(' · ')})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

interface DueTodayThisWeekProps {
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
  dueThisMonth: DueItem[]
  dueThisQuarter: DueItem[]
}

export function DueTodayThisWeek({
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
}: DueTodayThisWeekProps) {
  return (
    <div className='space-y-4'>
      <DueCard
        title='Due Today'
        icon={Calendar}
        items={dueToday}
        emptyMessage='Nothing due today'
        highlight
      />
      <DueCard
        title='Due This Week'
        icon={CalendarClock}
        items={dueThisWeek}
        emptyMessage='Nothing due this week'
      />
      <DueCard
        title='Due This Month'
        icon={CalendarClock}
        items={dueThisMonth}
        emptyMessage='Nothing due this month'
      />
      <DueCard
        title='Due This Quarter'
        icon={CalendarClock}
        items={dueThisQuarter}
        emptyMessage='Nothing due this quarter'
      />
    </div>
  )
}
