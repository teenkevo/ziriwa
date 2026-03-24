'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle, Users } from 'lucide-react'
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
import { CreateStaffDialog } from './create-staff-dialog'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
}

interface ManagerSwitcherProps {
  managers: StaffMember[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  divisionId: string
}

export function ManagerSwitcher({
  managers,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or create manager',
  divisionId,
}: ManagerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const selected = managers.find(m => m._id === value)
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
    <Dialog
      open={showCreateDialog}
      onOpenChange={setShowCreateDialog}
    >
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
                {managers.map(m => (
                  <CommandItem
                    key={m._id}
                    onSelect={() => {
                      onChange(m._id)
                      setOpen(false)
                    }}
                    className='text-sm'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-5 w-5',
                        value === m._id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {m.fullName}
                    {m.staffId ? ` (${m.staffId})` : ''}
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
        divisionId={divisionId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
