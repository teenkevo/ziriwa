'use client'

import * as React from 'react'
import { ChevronsUpDown, PlusCircle, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

import type { StaffPickerMember } from '@/lib/staff-picker'
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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { StaffPickerCommandItems } from '@/components/staff/staff-picker-command-items'
import { CreateStaffDialog } from './create-staff-dialog'

export type StaffMember = StaffPickerMember

interface ManagerSwitcherProps {
  managers: StaffPickerMember[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  divisionId?: string
  /** Section being edited; keeps its manager selectable. */
  currentSectionId?: string
}

export function ManagerSwitcher({
  managers,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or create manager',
  divisionId,
  currentSectionId,
}: ManagerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [createdManagers, setCreatedManagers] = React.useState<
    StaffPickerMember[]
  >([])

  const managerOptions = React.useMemo(() => {
    const managerIds = new Set(managers.map(manager => manager._id))
    return [
      ...managers,
      ...createdManagers.filter(manager => !managerIds.has(manager._id)),
    ]
  }, [createdManagers, managers])

  const selected = managerOptions.find(m => m._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = (newStaff: StaffMember) => {
    setCreatedManagers(current => {
      if (current.some(manager => manager._id === newStaff._id)) {
        return current
      }
      return [...current, newStaff]
    })
    onChange(newStaff._id)
    setShowCreateDialog(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select manager'
            disabled={disabled}
            className={cn('w-full justify-between')}
          >
            <Users className='text-muted-foreground' />
            {displayLabel}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search manager...' />
            <CommandList>
              <CommandEmpty>No manager found.</CommandEmpty>
              <CommandGroup heading='Managers'>
                <StaffPickerCommandItems
                  members={managerOptions}
                  value={value}
                  roleLabel='Manager'
                  currentEntityId={currentSectionId}
                  onSelect={id => {
                    onChange(id)
                    setOpen(false)
                  }}
                />
              </CommandGroup>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowCreateDialog(true)
                    }}
                  >
                    <PlusCircle className='h-5 w-5' />
                    Create Manager
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
        fixedRole='manager'
        {...(divisionId ? { divisionId } : {})}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
