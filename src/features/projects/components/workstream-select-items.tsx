'use client'

import { Badge } from '@/components/ui/badge'
import { SelectItem } from '@/components/ui/select'
import { isWorkstreamLeadSlotTaken } from '@/lib/project-workstream-assignment'

interface WorkstreamOption {
  _id: string
  name: string
}

interface WorkstreamSelectItemsProps {
  workstreams: WorkstreamOption[]
  /** When set, grey out workstreams that already have a lead (one lead per workstream). */
  occupiedWorkstreamIds?: Set<string>
  /** Keeps this workstream selectable while editing an existing lead assignment. */
  allowedWorkstreamId?: string
}

export function WorkstreamSelectItems({
  workstreams,
  occupiedWorkstreamIds,
  allowedWorkstreamId,
}: WorkstreamSelectItemsProps) {
  return (
    <>
      {workstreams.map(w => {
        const isOccupied =
          occupiedWorkstreamIds != null &&
          isWorkstreamLeadSlotTaken(
            w._id,
            occupiedWorkstreamIds,
            allowedWorkstreamId,
          )

        return (
          <SelectItem
            key={w._id}
            value={w._id}
            disabled={isOccupied}
            className={isOccupied ? 'pointer-events-none opacity-50' : undefined}
          >
            <span className='flex items-center gap-2'>
              {w.name}
              {isOccupied ? (
                <Badge
                  variant='outline'
                  className='px-1.5 py-0 text-[10px] font-normal'
                >
                  Already assigned
                </Badge>
              ) : null}
            </span>
          </SelectItem>
        )
      })}
    </>
  )
}
