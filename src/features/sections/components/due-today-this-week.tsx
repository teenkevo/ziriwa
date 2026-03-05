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
}

interface DueTodayThisWeekProps {
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
}

export function DueTodayThisWeek({
  dueToday,
  dueThisWeek,
}: DueTodayThisWeekProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <Calendar className='h-4 w-4' />
            Due Today
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {dueToday.length === 0 ? (
            <p className='text-xs text-muted-foreground'>Nothing due today</p>
          ) : (
            <ul className='space-y-2'>
              {dueToday.map(item => (
                <li
                  key={item._key}
                  className='text-sm border-l-2 border-primary pl-2'
                >
                  <span className='font-medium'>{item.title}</span>
                  {item.initiativeTitle && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      ({item.initiativeTitle})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium'>
            <CalendarClock className='h-4 w-4' />
            Due This Week
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {dueThisWeek.length === 0 ? (
            <p className='text-xs text-muted-foreground'>
              Nothing due this week
            </p>
          ) : (
            <ul className='space-y-2'>
              {dueThisWeek.map(item => (
                <li
                  key={item._key}
                  className='text-sm border-l-2 border-muted pl-2'
                >
                  <span className='font-medium'>{item.title}</span>
                  {item.targetDate && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      {format(parseISO(item.targetDate), 'EEE, MMM d')}
                    </span>
                  )}
                  {item.initiativeTitle && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      ({item.initiativeTitle})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
