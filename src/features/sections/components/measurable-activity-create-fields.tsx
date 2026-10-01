'use client'

import { Label } from '@/components/ui/label'
import { ActivityAssigneesPicker } from '@/features/sections/components/activity-assignees-picker'
import {
  evidenceChipsForSubmit,
  ExpectedEvidenceInput,
  type EvidenceChip,
} from '@/features/sections/components/expected-evidence-input'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'

interface MeasurableActivityCreateFieldsProps {
  activityType: 'core' | 'cross-cutting' | ''
  assigneeIds: string[]
  onAssigneeIdsChange: (ids: string[]) => void
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  unassignedLabel?: string
  evidenceItems: EvidenceChip[]
  onEvidenceItemsChange: (items: EvidenceChip[]) => void
  evidencePending: string
  onEvidencePendingChange: (value: string) => void
  disabled?: boolean
}

export function hasRequiredAssigneeAndEvidence(input: {
  activityType: 'core' | 'cross-cutting' | ''
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeIds: string[]
  evidenceItems: EvidenceChip[]
  evidencePending: string
}): boolean {
  const hasEvidence =
    evidenceChipsForSubmit(input.evidenceItems, input.evidencePending).length >
    0
  const assigneesRequired =
    Boolean(input.assigneeOptions) && input.activityType !== 'cross-cutting'
  const hasAssignees = !assigneesRequired || input.assigneeIds.length > 0
  return hasEvidence && hasAssignees
}

export function MeasurableActivityCreateFields({
  activityType,
  assigneeIds,
  onAssigneeIdsChange,
  assigneeOptions = null,
  assigneeEmptyLabel = 'No staff on the level below yet.',
  unassignedLabel = 'Assign',
  evidenceItems,
  onEvidenceItemsChange,
  evidencePending,
  onEvidencePendingChange,
  disabled = false,
}: MeasurableActivityCreateFieldsProps) {
  const selected = assigneeIds.map(id => ({
    _id: id,
    fullName: assigneeOptions?.find(option => option._id === id)?.fullName,
  }))
  const assigneesRequired =
    Boolean(assigneeOptions) && activityType !== 'cross-cutting'

  return (
    <>
      {assigneeOptions ? (
        <div className='space-y-2'>
          <Label required={assigneesRequired}>Assignees</Label>
          {activityType === 'cross-cutting' ? (
            <p className='text-sm text-muted-foreground'>Owned at this level</p>
          ) : (
            <ActivityAssigneesPicker
              assignees={selected}
              options={assigneeOptions}
              emptyLabel={assigneeEmptyLabel}
              unassignedLabel={unassignedLabel}
              triggerClassName='w-full'
              disabled={disabled}
              onChange={onAssigneeIdsChange}
            />
          )}
        </div>
      ) : null}
      <div className='space-y-2'>
        <Label htmlFor='activity-evidence' required>
          Expected evidence
        </Label>
        <ExpectedEvidenceInput
          id='activity-evidence'
          items={evidenceItems}
          onChange={onEvidenceItemsChange}
          pending={evidencePending}
          onPendingChange={onEvidencePendingChange}
          disabled={disabled}
        />
      </div>
    </>
  )
}
