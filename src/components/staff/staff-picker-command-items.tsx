'use client'

import { Check } from 'lucide-react'

import {
  formatStaffPickerLabel,
  isStaffPickerDisabled,
  type StaffPickerMember,
} from '@/lib/staff-picker'
import { cn } from '@/lib/utils'
import { CommandItem } from '@/components/ui/command'

interface StaffPickerCommandItemsProps {
  members: StaffPickerMember[]
  value: string
  roleLabel: string
  currentEntityId?: string
  onSelect: (id: string) => void
}

export function StaffPickerCommandItems({
  members,
  value,
  roleLabel,
  currentEntityId,
  onSelect,
}: StaffPickerCommandItemsProps) {
  return (
    <>
      {members.map(member => {
        const disabled = isStaffPickerDisabled(member, currentEntityId)
        const label = formatStaffPickerLabel(member, roleLabel, disabled)

        return (
          <CommandItem
            key={member._id}
            value={`${member.fullName} ${member.staffId ?? ''} ${member.assignedLabel ?? ''}`}
            disabled={disabled}
            onSelect={() => {
              if (disabled) return
              onSelect(member._id)
            }}
            className={cn('text-sm', disabled && 'opacity-50')}
          >
            <Check
              className={cn(
                'mr-2 h-5 w-5',
                value === member._id ? 'opacity-100' : 'opacity-0',
              )}
            />
            {label}
          </CommandItem>
        )
      })}
    </>
  )
}
