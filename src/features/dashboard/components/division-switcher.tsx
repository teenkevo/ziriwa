'use client'

import * as React from 'react'
import { Building2, Check, ChevronsUpDown, Loader2, PlusCircle } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getDefaultDivisionSlug } from '@/lib/division'
import { AssistantCommissionerSwitcher } from './assistant-commissioner-switcher'

export type Division = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  isDefault?: boolean
}

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

interface DivisionSwitcherProps {
  divisions: Division[]
  assistantCommissioners: StaffMember[]
  selectedSlug: string
  className?: string
}

export default function DivisionSwitcher({
  divisions,
  assistantCommissioners,
  selectedSlug,
  className,
}: DivisionSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [createFullName, setCreateFullName] = React.useState('')
  const [createAcronym, setCreateAcronym] = React.useState('')
  const [createAssistantCommissionerId, setCreateAssistantCommissionerId] =
    React.useState<string>('')
  const [isSelecting, setIsSelecting] = React.useState(false)

  const selectedDivision =
    divisions.find(
      d => d.slug?.current === selectedSlug || d.name.toLowerCase() === selectedSlug,
    ) || divisions[0]

  const handleSelect = async (division: Division) => {
    const slug = division.slug?.current || division.name.toLowerCase().replace(/\s+/g, '-')
    setIsSelecting(true)
    try {
      await fetch('/api/division/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      setOpen(false)
      router.refresh()
    } finally {
      setIsSelecting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createFullName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: createFullName.trim(),
          acronym: createAcronym.trim() || undefined,
          assistantCommissionerId: createAssistantCommissionerId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }
      const { slug } = await res.json()
      setCreateFullName('')
      setCreateAcronym('')
      setCreateAssistantCommissionerId('')
      setShowCreateDialog(false)
      setOpen(false)
      await fetch('/api/division/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create division')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select division'
            className={cn('w-[200px] justify-between', className)}
          >
            <Building2 className='text-muted-foreground' />
            {divisions.length > 0
              ? (selectedDivision?.name || selectedSlug || 'Select division')
              : 'ITID Divisions'}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[200px] p-0'>
          <Command>
            <CommandInput placeholder='Search division...' />
            <CommandList>
              <CommandEmpty>No division found.</CommandEmpty>
              <CommandGroup heading='ITID Divisions'>
                {divisions.map(division => {
                  const slug = division.slug?.current || division.name.toLowerCase().replace(/\s+/g, '-')
                  const isSelected = selectedSlug === slug
                  return (
                    <CommandItem
                      key={division._id}
                      onSelect={() => handleSelect(division)}
                      className='text-sm'
                    >
                      {isSelecting ? (
                        <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                      ) : (
                        <Check
                          className={cn(
                            'mr-2 h-5 w-5',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      )}
                      {division.name}
                    </CommandItem>
                  )
                })}
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
                    Create Division
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Division</DialogTitle>
          <DialogDescription>
            Add a new division to ITID (e.g. IT Security, Infrastructure and
            Operations).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='fullName' required>Full Division Name</Label>
              <Input
                id='fullName'
                placeholder='e.g. Data Innovations and Projects'
                value={createFullName}
                onChange={e => setCreateFullName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='acronym'>Acronym (optional)</Label>
              <Input
                id='acronym'
                placeholder='e.g. DIP'
                value={createAcronym}
                onChange={e => setCreateAcronym(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='assistantCommissioner' required>Assistant Commissioner</Label>
              <AssistantCommissionerSwitcher
                assistantCommissioners={assistantCommissioners}
                value={createAssistantCommissionerId}
                onChange={id => setCreateAssistantCommissionerId(id || '')}
                disabled={isCreating}
                placeholder='Select or create assistant commissioner'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={
                isCreating ||
                !createFullName.trim() ||
                !createAssistantCommissionerId
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className='h-4 w-4' />
                  Create Division
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
