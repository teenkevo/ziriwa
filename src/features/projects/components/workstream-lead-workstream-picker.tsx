'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react'

import { CreateWorkstreamDialog } from '@/features/projects/components/create-workstream-dialog'
import { isWorkstreamLeadSlotTaken } from '@/lib/project-workstream-assignment'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface WorkstreamOption {
  _id: string
  name: string
}

interface WorkstreamLeadWorkstreamPickerProps {
  projectId: string
  workstreams: WorkstreamOption[]
  value: string
  onChange: (workstreamId: string) => void
  occupiedWorkstreamIds?: Set<string>
  onWorkstreamCreated: (workstream: WorkstreamOption) => void
  disabled?: boolean
  placeholder?: string
}

export function WorkstreamLeadWorkstreamPicker({
  projectId,
  workstreams,
  value,
  onChange,
  occupiedWorkstreamIds,
  onWorkstreamCreated,
  disabled = false,
  placeholder = 'Choose Lead',
}: WorkstreamLeadWorkstreamPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [showCreateWorkstream, setShowCreateWorkstream] = React.useState(false)

  const selected = workstreams.find(w => w._id === value)

  function handleWorkstreamCreated(workstream: WorkstreamOption) {
    onWorkstreamCreated(workstream)
    onChange(workstream._id)
    setShowCreateWorkstream(false)
    setOpen(false)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select workstream'
            disabled={disabled}
            className={cn('w-full justify-between font-normal')}
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected?.name ?? placeholder}
            </span>
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command>
            <CommandInput placeholder='Search workstreams…' />
            <CommandList>
              <CommandEmpty>
                {workstreams.length === 0
                  ? 'No workstreams yet.'
                  : 'No matching workstream.'}
              </CommandEmpty>
              <CommandGroup heading='Workstreams'>
                {workstreams.map(workstream => {
                  const isOccupied =
                    occupiedWorkstreamIds != null &&
                    isWorkstreamLeadSlotTaken(
                      workstream._id,
                      occupiedWorkstreamIds,
                    )
                  const isSelected = value === workstream._id

                  return (
                    <CommandItem
                      key={workstream._id}
                      value={`${workstream.name} ${workstream._id}`}
                      disabled={isOccupied}
                      onSelect={() => {
                        if (isOccupied) return
                        onChange(workstream._id)
                        setOpen(false)
                      }}
                      className={cn(
                        'justify-between text-sm',
                        isOccupied && 'opacity-50',
                      )}
                    >
                      <span className='flex min-w-0 items-center gap-2 truncate'>
                        {workstream.name}
                        {isOccupied ? (
                          <Badge
                            variant='outline'
                            className='px-1.5 py-0 text-[10px] font-normal'
                          >
                            Already assigned
                          </Badge>
                        ) : null}
                      </span>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setShowCreateWorkstream(true)
                  }}
                >
                  <PlusCircle className='h-5 w-5 text-primary' />
                  Create workstream
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateWorkstreamDialog
        projectId={projectId}
        open={showCreateWorkstream}
        onOpenChange={setShowCreateWorkstream}
        showTrigger={false}
        nameOnly
        onWorkstreamCreated={handleWorkstreamCreated}
      />
    </>
  )
}
