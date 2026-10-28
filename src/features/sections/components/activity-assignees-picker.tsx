'use client'

import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { dropdownSurfaceClassName } from '@/components/ui/dropdown-surface'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ASSIGN_TO_MYSELF_LABEL,
  ASSIGNED_TO_MYSELF_LABEL,
  buildAssigneeNameMap,
} from '@/lib/contract-cascade/assignee-names'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import { cn } from '@/lib/utils'

interface ActivityAssigneesPickerProps {
  assignees: { _id: string; fullName?: string }[] | undefined
  /** Staff one level below, selectable as assignees. */
  options: CascadeAssigneeOption[]
  /** Shown inside the popover when nobody can be assigned yet. */
  emptyLabel: string
  /** Trigger label while nothing is assigned. Names the role one level below. */
  unassignedLabel: string
  triggerClassName?: string
  disabled?: boolean
  onChange: (assigneeIds: string[]) => void
}

/**
 * Multi-select assignee picker shared by the measurable activities table and
 * the activity details panel.
 */
export function ActivityAssigneesPicker({
  assignees,
  options,
  emptyLabel,
  unassignedLabel,
  triggerClassName,
  disabled = false,
  onChange,
}: ActivityAssigneesPickerProps) {
  const selectedIds = (assignees ?? [])
    .map(person => person._id)
    .filter(Boolean)
  const known = buildAssigneeNameMap(assignees, options)
  const selfOption = options.find(option => option.assignToSelf)
  const listedIds = new Set(options.map(option => option._id))
  const choices: CascadeAssigneeOption[] = [
    ...options.filter(option => !option.assignToSelf),
    ...(assignees ?? []).flatMap(person =>
      person._id && !listedIds.has(person._id)
        ? [
            {
              _id: person._id,
              fullName: person.fullName?.trim() || 'Staff',
            },
          ]
        : [],
    ),
    ...(selfOption ? [selfOption] : []),
  ]
  const label =
    selectedIds.length === 0
      ? unassignedLabel
      : selectedIds.map(id => known.get(id) ?? 'Staff').join(', ')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={cn(
            'h-9 justify-between gap-2 truncate text-xs font-normal',
            dropdownSurfaceClassName,
            triggerClassName,
          )}
          disabled={disabled}
          onClick={event => event.stopPropagation()}
        >
          <span className='min-w-0 truncate'>{label}</span>
          <ChevronDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-64 p-2'
        onClick={event => event.stopPropagation()}
      >
        {choices.length === 0 ? (
          <p className='px-2 py-1.5 text-xs text-muted-foreground'>
            {emptyLabel}
          </p>
        ) : (
          <div className='flex max-h-56 flex-col gap-1 overflow-y-auto'>
            {choices.map(person => {
              const checked = selectedIds.includes(person._id)
              const assignToSelf = person.assignToSelf === true
              return (
                <label
                  key={person._id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                    assignToSelf && 'mt-1 border-t border-border pt-2',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={value => {
                      const next = value
                        ? [...selectedIds, person._id]
                        : selectedIds.filter(id => id !== person._id)
                      onChange([...new Set(next)])
                    }}
                  />
                  <span className='min-w-0 truncate'>
                    {assignToSelf
                      ? checked
                        ? ASSIGNED_TO_MYSELF_LABEL
                        : ASSIGN_TO_MYSELF_LABEL
                      : person.fullName}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
