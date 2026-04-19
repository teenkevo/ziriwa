'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle, UserCheck } from 'lucide-react'
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
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CreateStaffDialog } from '@/features/dashboard/components/create-staff-dialog'

export type Supervisor = {
  _id: string
  fullName: string
  staffId?: string
}

interface SupervisorSwitcherProps {
  supervisors: Supervisor[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  sectionId: string
}

export function SupervisorSwitcher({
  supervisors,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or create supervisor',
  sectionId,
}: SupervisorSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const selected = supervisors.find(s => s._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = async (newStaff: {
    _id: string
    fullName: string
  }) => {
    onChange(newStaff._id)
    setShowCreateDialog(false)
    setOpen(false)
    await router.refresh()
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select supervisor'
            disabled={disabled}
            className={cn('w-full justify-between')}
          >
            <UserCheck className='h-4 w-4 shrink-0 text-muted-foreground' />
            {displayLabel}
            <ChevronsUpDown className='ml-auto h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search supervisor...' />
            <CommandList>
              <CommandEmpty>No supervisor found.</CommandEmpty>
              <CommandGroup heading='Supervisors'>
                {supervisors.map(s => (
                  <CommandItem
                    key={s._id}
                    onSelect={() => {
                      onChange(s._id)
                      setOpen(false)
                    }}
                    className='text-sm'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-5 w-5',
                        value === s._id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {s.fullName}
                    {s.staffId ? ` (${s.staffId})` : ''}
                  </CommandItem>
                ))}
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
                    Create Supervisor
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
        fixedRole='supervisor'
        fixedSectionId={sectionId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}

