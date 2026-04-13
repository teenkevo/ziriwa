'use client'

import * as React from 'react'
import {
  Building,
  Check,
  ChevronsUpDown,
  Loader2,
  PlusCircle,
} from 'lucide-react'
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
} from '@/components/ui/dialog'
import { hasRoleAtLeast } from '@/lib/app-role'
import { useAppRole } from '@/hooks/use-app-role'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CommissionerSwitcher } from './commissioner-switcher'

export type Department = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
}

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

interface DepartmentSwitcherProps {
  departments: Department[]
  commissioners: StaffMember[]
  selectedId: string
  className?: string
}

export default function DepartmentSwitcher({
  departments,
  commissioners,
  selectedId,
  className,
}: DepartmentSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [createFullName, setCreateFullName] = React.useState('')
  const [createAcronym, setCreateAcronym] = React.useState('')
  const [createCommissionerId, setCreateCommissionerId] =
    React.useState<string>('')
  const [isSelecting, setIsSelecting] = React.useState(false)

  const selectedDepartment =
    departments.find(d => d._id === selectedId) || departments[0]

  const { role, isLoaded } = useAppRole()
  const canCreateDepartment =
    isLoaded && hasRoleAtLeast(role, 'commissioner')

  const handleSelect = async (department: Department) => {
    setIsSelecting(true)
    try {
      await fetch('/api/department/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: department._id }),
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
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: createFullName.trim(),
          acronym: createAcronym.trim() || undefined,
          commissionerId: createCommissionerId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }
      const { id } = await res.json()
      setCreateFullName('')
      setCreateAcronym('')
      setCreateCommissionerId('')
      setShowCreateDialog(false)
      setOpen(false)
      await fetch('/api/department/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select department'
            className={cn('w-[400px] justify-between', className)}
          >
            <Building className='text-muted-foreground' />
            {departments.length > 0
              ? selectedDepartment?.fullName ||
                selectedDepartment?.name ||
                'Select department'
              : 'Departments'}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[400px] p-0'>
          <Command>
            <CommandInput placeholder='Search department...' />
            <CommandList>
              <CommandEmpty>No department found.</CommandEmpty>
              <CommandGroup heading='Departments'>
                {departments.map(department => {
                  const isSelected = selectedId === department._id
                  return (
                    <CommandItem
                      key={department._id}
                      value={
                        [
                          department.fullName,
                          department.acronym,
                          department.name,
                        ]
                          .filter(Boolean)
                          .join(' ') || department._id
                      }
                      onSelect={() => handleSelect(department)}
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
                      {department.fullName || department.name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {canCreateDepartment && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowCreateDialog(true)
                    }}
                  >
                    <PlusCircle className='h-5 w-5' />
                    Create Department
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {canCreateDepartment && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>
            Add a new department (e.g. Information Technology and Innovation
            Department, Human Resources).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='deptFullName' required>
                Full Department Name
              </Label>
              <Input
                id='deptFullName'
                placeholder='e.g. Information Technology and Innovation Department'
                value={createFullName}
                onChange={e => setCreateFullName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='deptAcronym'>Acronym (optional)</Label>
              <Input
                id='deptAcronym'
                placeholder='e.g. ITID'
                value={createAcronym}
                onChange={e => setCreateAcronym(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='commissioner'>Commissioner</Label>
              <CommissionerSwitcher
                commissioners={commissioners}
                value={createCommissionerId}
                onChange={id => setCreateCommissionerId(id || '')}
                disabled={isCreating}
                placeholder='Select or create commissioner'
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
              disabled={isCreating || !createFullName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className='h-4 w-4' />
                  Create Department
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
