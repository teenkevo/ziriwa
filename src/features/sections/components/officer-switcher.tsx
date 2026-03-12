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
  value: string | null | undefined
  onChange: (id: string | null) => void
  disabled?: boolean
  placeholder?: string
  sectionId: string
}

export function OfficerSwitcher({
  officers,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or create officer',
  sectionId,
}: OfficerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const selected = officers.find(o => o._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = (newStaff: { _id: string; fullName: string }) => {
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
            aria-label='Select officer'
            disabled={disabled}
            className={cn('w-full justify-between')}
          >
            <User className='h-4 w-4 shrink-0 text-muted-foreground' />
            {displayLabel}
            <ChevronsUpDown className='ml-auto h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search officer...' />
            <CommandList>
              <CommandEmpty>No officer found.</CommandEmpty>
              <CommandGroup heading='Officers'>
                <CommandItem
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className='text-sm'
                >
                  <Check
                    className={cn(
                      'mr-2 h-5 w-5',
                      !value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  None
                </CommandItem>
                {officers.map(o => (
                  <CommandItem
                    key={o._id}
                    onSelect={() => {
                      onChange(o._id)
                      setOpen(false)
                    }}
                    className='text-sm'
                  >
                    <Check
                      className={cn(
                        'mr-2 h-5 w-5',
                        value === o._id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {o.fullName}
                    {o.staffId ? ` (${o.staffId})` : ''}
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
