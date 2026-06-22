'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseValueParts(iso?: string): { date?: Date; time: string } {
  if (!iso) return { time: '09:00' }

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { time: '09:00' }

  return {
    date: parsed,
    time: format(parsed, 'HH:mm'),
  }
}

function combineDateAndTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(part => Number(part))
  const combined = new Date(date)
  combined.setHours(hours || 0, minutes || 0, 0, 0)
  return combined.toISOString()
}

function getDisplayDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(part => Number(part))
  const display = new Date(date)
  display.setHours(hours || 0, minutes || 0, 0, 0)
  return display
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick date and time',
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const initialParts = parseValueParts(value)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    initialParts.date,
  )
  const [time, setTime] = React.useState(initialParts.time)

  React.useEffect(() => {
    const next = parseValueParts(value)
    setSelectedDate(next.date)
    setTime(next.time)
  }, [value])

  const displayValue =
    selectedDate != null ? getDisplayDate(selectedDate, time) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayValue && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4 shrink-0' />
          {displayValue ? (
            format(displayValue, 'PPP p')
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <div className='flex items-stretch'>
          <Calendar
            mode='single'
            selected={selectedDate}
            onSelect={date => {
              if (!date) return
              setSelectedDate(date)
              onChange(combineDateAndTime(date, time))
            }}
            initialFocus
          />
          <div className='flex min-w-[7.5rem] flex-col justify-center gap-2 border-l p-3'>
            <Label htmlFor={`${id ?? 'datetime'}-time`} className='text-xs'>
              Time
            </Label>
            <Input
              id={`${id ?? 'datetime'}-time`}
              type='time'
              value={time}
              disabled={disabled || !selectedDate}
              onChange={event => {
                const nextTime = event.target.value
                setTime(nextTime)
                if (selectedDate) {
                  onChange(combineDateAndTime(selectedDate, nextTime))
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
