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
  /** When true, show the selection checkmark on the right. */
  checkOnEnd?: boolean
  /** When false, omit staff id from the item label. */
  showStaffId?: boolean
  /** How to show an assigned workstream/entity when the item is disabled. */
  assignedLabelFormat?: 'brackets' | 'role-suffix'
}

export function StaffPickerCommandItems({
  members,
  value,
  roleLabel,
  currentEntityId,
  onSelect,
  checkOnEnd = false,
  showStaffId = true,
  assignedLabelFormat = 'role-suffix',
}: StaffPickerCommandItemsProps) {
  return (
    <>
      {members.map(member => {
        const disabled = isStaffPickerDisabled(member, currentEntityId)
        const label = formatStaffPickerLabel(
          member,
          roleLabel,
          disabled,
          showStaffId,
          assignedLabelFormat,
        )
        const isSelected = value === member._id
        const check = (
          <Check
            className={cn(
              'h-5 w-5 shrink-0',
              checkOnEnd ? 'ml-2' : 'mr-2',
              isSelected ? 'opacity-100' : 'opacity-0',
            )}
          />
        )

        return (
          <CommandItem
            key={member._id}
            value={`${member.fullName} ${member.staffId ?? ''} ${member.assignedLabel ?? ''}`}
            disabled={disabled}
            onSelect={() => {
              if (disabled) return
              onSelect(member._id)
            }}
            className={cn(
              'text-sm',
              checkOnEnd && 'justify-between',
              disabled && 'opacity-50',
            )}
          >
            {checkOnEnd ? (
              <>
                <span className='truncate'>{label}</span>
                {check}
              </>
            ) : (
              <>
                {check}
                {label}
              </>
            )}
          </CommandItem>
        )
      })}
    </>
  )
}
