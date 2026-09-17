'use client'

import * as React from 'react'
import { CalendarRange, Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { useFinancialYear } from '@/contexts/financial-year-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function FinancialYearSwitcher({ className }: { className?: string }) {
  const {
    active,
    calendarCurrent,
    options,
    isHistorical,
    isSwitching,
    displayLabel,
    switchFinancialYear,
  } = useFinancialYear()
  const [open, setOpen] = React.useState(false)

  async function handleSelect(label: string) {
    if (label === active.label || isSwitching) return
    setOpen(false)
    try {
      await switchFinancialYear(label)
    } catch (err) {
      console.error(err)
      alert(
        err instanceof Error ? err.message : 'Failed to switch financial year',
      )
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='default'
          size='sm'
          className={cn('h-8 gap-1.5 px-2.5', className)}
          disabled={isSwitching}
          aria-label='Switch financial year'
        >
          {isSwitching ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <CalendarRange className='h-3.5 w-3.5' />
          )}
          <span className='max-w-[7.5rem] truncate sm:max-w-none'>
            {displayLabel}
          </span>
          {isHistorical ? (
            <Badge
              variant='secondary'
              className='hidden h-5 border-0 bg-primary-foreground/15 px-1.5 text-[10px] font-medium text-primary-foreground sm:inline-flex'
            >
              Past
            </Badge>
          ) : null}
          <ChevronsUpDown className='h-3.5 w-3.5 opacity-70' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuLabel className='font-normal text-muted-foreground'>
          Financial year
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(fy => {
          const isActive = fy.label === displayLabel
          const isCurrent = fy.label === calendarCurrent.label
          return (
            <DropdownMenuItem
              key={fy.label}
              disabled={isSwitching}
              onSelect={e => {
                e.preventDefault()
                void handleSelect(fy.label)
              }}
              className='flex items-center justify-between gap-2'
            >
              <span className='flex min-w-0 items-center gap-2'>
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className='truncate'>{fy.label}</span>
              </span>
              {isCurrent ? (
                <span className='text-[10px] text-muted-foreground'>
                  Current
                </span>
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
