'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

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
import { cn } from '@/lib/utils'
import type { SectionPickerOption } from '@/app/api/sections/picker/route'

interface SectionPickerProps {
  value: string
  onValueChange: (sectionId: string) => void
  excludeSectionId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SectionPicker({
  value,
  onValueChange,
  excludeSectionId,
  placeholder = 'Select section…',
  disabled,
  className,
}: SectionPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [sections, setSections] = React.useState<SectionPickerOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (excludeSectionId) {
          params.set('excludeSectionId', excludeSectionId)
        }
        const res = await fetch(`/api/sections/picker?${params}`)
        if (!res.ok) return
        const data = (await res.json()) as { sections: SectionPickerOption[] }
        if (!cancelled) setSections(data.sections ?? [])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [excludeSectionId])

  const selected = sections.find(s => s._id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn('w-full justify-between font-normal', className)}
        >
          {isLoading ? (
            <span className='flex items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading sections…
            </span>
          ) : selected ? (
            <span className='truncate'>
              {selected.name}
              {selected.divisionName && (
                <span className='text-muted-foreground'>
                  {' '}
                  · {selected.divisionName}
                </span>
              )}
            </span>
          ) : (
            <span className='text-muted-foreground'>{placeholder}</span>
          )}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
        <Command>
          <CommandInput placeholder='Search section or division…' />
          <CommandList>
            <CommandEmpty>No section found.</CommandEmpty>
            <CommandGroup>
              {sections.map(section => (
                <CommandItem
                  key={section._id}
                  value={`${section.name} ${section.divisionName ?? ''}`}
                  onSelect={() => {
                    onValueChange(section._id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === section._id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className='flex min-w-0 flex-col'>
                    <span className='truncate'>{section.name}</span>
                    {section.divisionName && (
                      <span className='text-xs text-muted-foreground truncate'>
                        {section.divisionName}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
