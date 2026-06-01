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

interface CommissionerSwitcherProps {
  commissioners: StaffPickerMember[]
  value: string
  onChange: (id: string | null) => void
  disabled?: boolean
  placeholder?: string
  /** When set, new commissioners are linked to this department; omit for unassigned. */
  departmentId?: string
  /** Department being edited; keeps its commissioner selectable. */
  currentDepartmentId?: string
}

export function CommissionerSwitcher({
  commissioners,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select commissioner',
  departmentId,
  currentDepartmentId,
}: CommissionerSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [createdCommissioners, setCreatedCommissioners] = React.useState<
    StaffPickerMember[]
  >([])

  const commissionerOptions = React.useMemo(() => {
    const commissionerIds = new Set(
      commissioners.map(commissioner => commissioner._id),
    )
    return [
      ...commissioners,
      ...createdCommissioners.filter(
        commissioner => !commissionerIds.has(commissioner._id),
      ),
    ]
  }, [commissioners, createdCommissioners])

  const selected = commissionerOptions.find(a => a._id === value)
  const displayLabel = selected
    ? `${selected.fullName}${selected.staffId ? ` (${selected.staffId})` : ''}`
    : placeholder

  const handleCreateSuccess = (newStaff: StaffMember) => {
    setCreatedCommissioners(current => {
      if (current.some(commissioner => commissioner._id === newStaff._id)) {
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
                <StaffPickerCommandItems
                  members={commissionerOptions}
                  value={value}
                  roleLabel='Commissioner'
                  currentEntityId={currentDepartmentId}
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
