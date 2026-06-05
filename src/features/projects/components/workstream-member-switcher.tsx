'use client'

import * as React from 'react'
import { ChevronsUpDown, PlusCircle, User } from 'lucide-react'
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
import { CreateStaffDialog } from '@/features/dashboard/components/create-staff-dialog'

interface WorkstreamMemberSwitcherProps {
  officers: StaffPickerMember[]
  value: string
  onChange: (id: string) => void
  workstreamId: string
  disabled?: boolean
  placeholder?: string
}

export function WorkstreamMemberSwitcher({
  officers,
  value,
  onChange,
  workstreamId,
  disabled = false,
  placeholder = 'Select or create workstream member',
}: WorkstreamMemberSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [created, setCreated] = React.useState<StaffPickerMember[]>([])

  const options = React.useMemo(() => {
    const ids = new Set(officers.map(o => o._id))
    return [...officers, ...created.filter(o => !ids.has(o._id))]
  }, [created, officers])

  const selected = options.find(o => o._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = (newStaff: StaffPickerMember) => {
    setCreated(current => {
      if (current.some(o => o._id === newStaff._id)) return current
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
            aria-label='Select workstream member'
            disabled={disabled || !workstreamId}
            className={cn('w-full justify-between')}
          >
            <User className='text-muted-foreground' />
            {displayLabel}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search officer…' />
            <CommandList>
              <CommandEmpty>No officer found.</CommandEmpty>
              <CommandGroup heading='Workstream members'>
                <StaffPickerCommandItems
                  members={options}
                  value={value}
                  roleLabel='Officer'
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
        fixedSectionId={workstreamId}
        onSuccess={handleCreateSuccess}
      />
    </Dialog>
  )
}
