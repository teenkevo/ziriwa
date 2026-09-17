'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CreateStaffDialog } from '@/features/dashboard/components/create-staff-dialog'

export type Officer = {
  _id: string
  fullName: string
  staffId?: string
}

interface OfficerSwitcherProps {
  officers: Officer[]
  value?: string | null
  values?: string[]
  onChange?: (id: string | null) => void
  onValuesChange?: (ids: string[]) => void
  multiple?: boolean
  lockedIds?: string[]
  disabled?: boolean
  placeholder?: string
  sectionId: string
  /** Smaller trigger and dropdown text (e.g. dense tables). */
  compact?: boolean
}

export function OfficerSwitcher({
  officers,
  value,
  values = [],
  onChange,
  onValuesChange,
  multiple = false,
  lockedIds = [],
  disabled = false,
  placeholder = 'Select or create officer',
  sectionId,
  compact = false,
}: OfficerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [createdOfficers, setCreatedOfficers] = React.useState<Officer[]>([])

  const officerOptions = React.useMemo(() => {
    const officerIds = new Set(officers.map(officer => officer._id))
    return [
      ...officers,
      ...createdOfficers.filter(officer => !officerIds.has(officer._id)),
    ]
  }, [createdOfficers, officers])

  const selectedIds = multiple ? values : value ? [value] : []
  const locked = new Set(lockedIds)
  const selectedOfficers = officerOptions.filter(officer =>
    selectedIds.includes(officer._id),
  )

  const displayLabel = (() => {
    if (selectedOfficers.length === 0) return placeholder
    const first = selectedOfficers[0]!
    const firstLabel = compact
      ? first.fullName
      : `${first.fullName}${first.staffId ? ` (${first.staffId})` : ''}`
    if (selectedOfficers.length === 1) return firstLabel
    return `${first.fullName} +${selectedOfficers.length - 1}`
  })()

  const handleCreateSuccess = (newStaff: { _id: string; fullName: string }) => {
    setCreatedOfficers(current => {
      if (current.some(officer => officer._id === newStaff._id)) {
        return current
      }
      return [...current, newStaff]
    })
    if (multiple) {
      onValuesChange?.(
        selectedIds.includes(newStaff._id)
          ? selectedIds
          : [...selectedIds, newStaff._id],
      )
    } else {
      onChange?.(newStaff._id)
    }
    setShowCreateDialog(false)
    setOpen(false)
    router.refresh()
  }

  function toggleOfficer(id: string) {
    if (locked.has(id) && selectedIds.includes(id)) return
    if (selectedIds.includes(id)) {
      onValuesChange?.(selectedIds.filter(selected => selected !== id))
      return
    }
    onValuesChange?.([...selectedIds, id])
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label={multiple ? 'Select officers' : 'Select officer'}
            disabled={disabled}
            className={cn(
              'w-full min-w-0 justify-between gap-1.5',
              compact && 'h-9 max-w-[148px] text-xs font-normal',
            )}
          >
            <User
              className={cn(
                'shrink-0 text-muted-foreground',
                compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
            />
            <span className='min-w-0 flex-1 truncate text-left'>
              {displayLabel}
            </span>
            <ChevronsUpDown
              className={cn(
                'shrink-0 opacity-50',
                compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            'w-[var(--radix-popover-trigger-width)] p-0',
            compact && 'text-xs',
          )}
        >
          <Command>
            <CommandInput
              placeholder='Search officer...'
              className={cn(compact && 'h-8 py-2 text-xs')}
            />
            <CommandList>
              <CommandEmpty>No officer found.</CommandEmpty>
              <CommandGroup heading='Officers'>
                <CommandItem
                  onSelect={() => {
                    if (multiple) {
                      onValuesChange?.(
                        selectedIds.filter(id => locked.has(id)),
                      )
                      return
                    }
                    onChange?.(null)
                    setOpen(false)
                  }}
                  className={cn(compact ? 'text-xs' : 'text-sm')}
                >
                  <Check
                    className={cn(
                      'mr-2 shrink-0',
                      compact ? 'h-4 w-4' : 'h-5 w-5',
                      selectedIds.length === 0 ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  None
                </CommandItem>
                {officerOptions.map(o => {
                  const isSelected = selectedIds.includes(o._id)
                  const isLocked = locked.has(o._id) && isSelected
                  return (
                    <CommandItem
                      key={o._id}
                      disabled={isLocked}
                      onSelect={() => {
                        if (multiple) {
                          toggleOfficer(o._id)
                          return
                        }
                        onChange?.(o._id)
                        setOpen(false)
                      }}
                      className={cn(compact ? 'text-xs' : 'text-sm')}
                    >
                      <Check
                        className={cn(
                          'mr-2 shrink-0',
                          compact ? 'h-4 w-4' : 'h-5 w-5',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {o.fullName}
                      {o.staffId ? ` (${o.staffId})` : ''}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowCreateDialog(true)
                    }}
                    className={cn(compact ? 'text-xs' : 'text-sm')}
                  >
                    <PlusCircle
                      className={cn(
                        'shrink-0',
                        compact ? 'h-4 w-4' : 'h-5 w-5',
                      )}
                    />
                    Create Officer
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateStaffDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        fixedRole='officer'
        fixedSectionId={sectionId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
