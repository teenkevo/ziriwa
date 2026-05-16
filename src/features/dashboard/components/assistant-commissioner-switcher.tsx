'use client'

import * as React from 'react'
import { ChevronsUpDown, PlusCircle, UserCog } from 'lucide-react'
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

interface AssistantCommissionerSwitcherProps {
  assistantCommissioners: StaffPickerMember[]
  value: string
  onChange: (id: string | null) => void
  disabled?: boolean
  placeholder?: string
  departmentId?: string
  divisionId?: string
  /** Division being edited; keeps its AC selectable. */
  currentDivisionId?: string
}

export function AssistantCommissionerSwitcher({
  assistantCommissioners,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select assistant commissioner',
  departmentId,
  divisionId,
  currentDivisionId,
}: AssistantCommissionerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const selected = assistantCommissioners.find(a => a._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = (newStaff: StaffMember) => {
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
            aria-label='Select assistant commissioner'
            disabled={disabled}
            className={cn('w-full justify-between')}
          >
            <UserCog className='text-muted-foreground' />
            {displayLabel}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search assistant commissioner...' />
            <CommandList>
              <CommandEmpty>No assistant commissioner found.</CommandEmpty>
              <CommandGroup heading='Assistant Commissioners'>
                <StaffPickerCommandItems
                  members={assistantCommissioners}
                  value={value}
                  roleLabel='Assistant Commissioner'
                  currentEntityId={currentDivisionId}
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
                    Create Assistant Commissioner
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
        fixedRole='assistant_commissioner'
        departmentId={departmentId}
        divisionId={divisionId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
