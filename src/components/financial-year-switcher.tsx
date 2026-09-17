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
import { useSidebarOptional } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function FinancialYearSwitcher({
  className,
  placement = 'default',
}: {
  className?: string
  /** Sidebar: full-width trigger above Dashboard; collapses to icon when the rail is icon-only. */
  placement?: 'default' | 'sidebar'
}) {
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
  const sidebar = useSidebarOptional()
  const isSidebarCollapsed =
    placement === 'sidebar' && sidebar?.state === 'collapsed'

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
          className={cn(
            'h-8 gap-1.5 px-2.5',
            placement === 'sidebar' && 'w-full justify-start',
            isSidebarCollapsed && 'size-8 justify-center px-0',
            className,
          )}
          disabled={isSwitching}
          aria-label='Switch financial year'
          title={displayLabel}
        >
          {isSwitching ? (
            <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' />
          ) : (
            <CalendarRange className='h-3.5 w-3.5 shrink-0' />
          )}
          {!isSidebarCollapsed ? (
            <>
              <span className='min-w-0 flex-1 truncate text-left'>
                {displayLabel}
              </span>
              {isHistorical ? (
                <Badge
                  variant='secondary'
                  className='h-5 shrink-0 border-0 bg-primary-foreground/15 px-1.5 text-[10px] font-medium text-primary-foreground'
                >
                  Past
                </Badge>
              ) : null}
              <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 opacity-70' />
            </>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={placement === 'sidebar' ? 'start' : 'end'}
        side={placement === 'sidebar' ? 'bottom' : 'bottom'}
        className='w-52'
      >
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
