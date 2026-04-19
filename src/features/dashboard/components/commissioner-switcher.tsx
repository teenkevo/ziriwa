'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle, UserCog } from 'lucide-react'
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
import { CreateStaffDialog } from './create-staff-dialog'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
}

interface CommissionerSwitcherProps {
  commissioners: StaffMember[]
  value: string
  onChange: (id: string | null) => void
  disabled?: boolean
  placeholder?: string
  /** When set, new commissioners are linked to this department; omit for unassigned. */
  departmentId?: string
}

export function CommissionerSwitcher({
  commissioners,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select commissioner',
  departmentId,
}: CommissionerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const selected = commissioners.find(a => a._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = async (newStaff: StaffMember) => {
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
            aria-label='Select commissioner'
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
            <CommandInput placeholder='Search commissioner...' />
            <CommandList>
              <CommandEmpty>No commissioner found.</CommandEmpty>
              <CommandGroup heading='Commissioners'>
                {commissioners.map(c => (
                  <CommandItem
                    key={c._id}
                    onSelect={() => {
                      onChange(c._id)
                      setOpen(false)
                    }}
                    className='text-sm'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-5 w-5',
                        value === c._id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {c.fullName}
                    {c.staffId ? ` (${c.staffId})` : ''}
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
                    Create Commissioner
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
        fixedRole='commissioner'
        departmentId={departmentId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
