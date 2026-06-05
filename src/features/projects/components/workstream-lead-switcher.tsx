'use client'

import * as React from 'react'
import { ChevronsUpDown, PlusCircle, Users } from 'lucide-react'

import { CreateProjectMemberDialog } from '@/features/projects/components/create-project-member-dialog'
import type { StaffPickerMember } from '@/lib/staff-picker'
import { filterWorkstreamLeadPickerMembers } from '@/lib/staff-picker'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { StaffPickerCommandItems } from '@/components/staff/staff-picker-command-items'

interface WorkstreamLeadSwitcherProps {
  projectId: string
  members: StaffPickerMember[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  /** Existing workstream — new leads are assigned here. Omit when creating a workstream. */
  workstreamId?: string
  workstreamName?: string
  /** New lead onboarded before the workstream document exists. */
  pendingWorkstreamLead?: boolean
  onMembersRefresh?: () => void
}

export function WorkstreamLeadSwitcher({
  projectId,
  members,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or create workstream lead',
  workstreamId,
  workstreamName,
  pendingWorkstreamLead = false,
  onMembersRefresh,
}: WorkstreamLeadSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [createdMembers, setCreatedMembers] = React.useState<
    StaffPickerMember[]
  >([])

  const memberOptions = React.useMemo(() => {
    const ids = new Set(members.map(m => m._id))
    const merged = [
      ...members,
      ...createdMembers.filter(m => !ids.has(m._id)),
    ]
    return filterWorkstreamLeadPickerMembers(merged)
  }, [createdMembers, members])

  const selected =
    memberOptions.find(m => m._id === value) ??
    members.find(m => m._id === value)
  const displayLabel = selected ? selected.fullName : placeholder

  function handleMemberCreated(member: { staffId: string; fullName: string }) {
    const nextMember: StaffPickerMember = {
      _id: member.staffId,
      fullName: member.fullName,
      projectRole: 'workstream_lead',
    }
    setCreatedMembers(current => {
      if (current.some(m => m._id === member.staffId)) return current
      return [...current, nextMember]
    })
    onChange(member.staffId)
    setShowCreateDialog(false)
    setOpen(false)
    onMembersRefresh?.()
  }

  const workstreamOptions =
    workstreamId && workstreamName
      ? [{ _id: workstreamId, name: workstreamName }]
      : []

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select workstream lead'
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
            <CommandInput placeholder='Search workstream leads…' />
            <CommandList>
              <CommandEmpty>
                {memberOptions.length === 0
                  ? 'No workstream leads yet.'
                  : 'No matching workstream lead.'}
              </CommandEmpty>
              <CommandGroup heading='Workstream leads'>
                <StaffPickerCommandItems
                  members={memberOptions}
                  value={value}
                  roleLabel='Workstream lead'
                  currentEntityId={workstreamId}
                  checkOnEnd
                  showStaffId={false}
                  assignedLabelFormat='brackets'
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
                    <PlusCircle className='h-5 w-5 text-primary' />
                    Create Workstream Lead
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateProjectMemberDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        workstreams={workstreamOptions}
        lockedRole='workstream_lead'
        pendingWorkstreamLead={pendingWorkstreamLead}
        fixedWorkstreamId={
          !pendingWorkstreamLead && workstreamId ? workstreamId : undefined
        }
        fixedWorkstreamName={
          !pendingWorkstreamLead && workstreamName ? workstreamName : undefined
        }
        hasProjectManager
        hasDeputyProjectManager
        onMemberCreated={handleMemberCreated}
        onSuccess={onMembersRefresh}
      />
    </Dialog>
  )
}
