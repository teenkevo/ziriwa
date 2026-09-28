'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { buildPlanningSectionName } from '@/lib/planning-section-name'
import { AnimatedExpand } from './animated-expand'
import { ManagerSwitcher } from './manager-switcher'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  order?: number
  isPlanningSection?: boolean
}

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

interface CreateSectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisionId: string
  /** Department owning the division (optional; used for labels / future use). */
  departmentId?: string
  divisionName: string
  divisionAcronym?: string
  managers: StaffMember[]
  onSuccess?: (section: Section) => void
}

export function CreateSectionDialog({
  open,
  onOpenChange,
  divisionId,
  divisionName,
  divisionAcronym,
  managers,
  onSuccess,
}: CreateSectionDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [name, setName] = React.useState('')
  const [managerId, setManagerId] = React.useState<string>('')
  const [isPlanningSection, setIsPlanningSection] = React.useState(false)

  const planningName = React.useMemo(
    () =>
      buildPlanningSectionName({
        acronym: divisionAcronym,
        name: divisionName,
      }),
    [divisionAcronym, divisionName],
  )

  React.useEffect(() => {
    if (!open) return
    setName('')
    setManagerId('')
    setIsPlanningSection(false)
  }, [open])

  const effectiveName = isPlanningSection ? planningName : name
  const canSubmit =
    Boolean(effectiveName.trim()) && (isPlanningSection || Boolean(managerId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: effectiveName.trim(),
          divisionId,
          managerId: isPlanningSection ? undefined : managerId,
          isPlanningSection,
          order: 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create section')
      }
      const newSection = await res.json()
      setName('')
      setManagerId('')
      setIsPlanningSection(false)
      onOpenChange(false)
      router.refresh()
      onSuccess?.(newSection)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create section')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isCreating}>
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Add a new section to {divisionName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-3'>
              <Label>Section type</Label>
              <RadioGroup
                value={isPlanningSection ? 'planning' : 'normal'}
                onValueChange={value => {
                  const planning = value === 'planning'
                  setIsPlanningSection(planning)
                  if (planning) setManagerId('')
                }}
                disabled={isCreating}
                className='grid gap-2'
              >
                <Label
                  htmlFor='section-type-normal'
                  className='cursor-pointer rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40'
                >
                  <div className='flex items-center gap-3'>
                    <RadioGroupItem value='normal' id='section-type-normal' />
                    <span className='font-medium'>Normal section</span>
                  </div>
                  <p className='mt-0.5 pl-7 text-xs text-muted-foreground'>
                    Supervisors report to the section manager.
                  </p>
                </Label>
                <Label
                  htmlFor='section-type-planning'
                  className='cursor-pointer rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40'
                >
                  <div className='flex items-center gap-3'>
                    <RadioGroupItem
                      value='planning'
                      id='section-type-planning'
                    />
                    <span className='font-medium'>Planning section</span>
                  </div>
                  <p className='mt-0.5 pl-7 text-xs text-muted-foreground'>
                    Supervisors report directly to the Assistant Commissioner.
                  </p>
                </Label>
              </RadioGroup>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sectionName' required>
                Section Name
              </Label>
              <Input
                id='sectionName'
                placeholder='e.g. Data Science, Data Engineering'
                value={isPlanningSection ? planningName : name}
                onChange={e => setName(e.target.value)}
                disabled={isCreating || isPlanningSection}
                required
              />
              <AnimatedExpand open={isPlanningSection} className='pt-1'>
                <p className='text-xs text-muted-foreground'>
                  Inferred as {planningName}.
                </p>
              </AnimatedExpand>
            </div>
            <AnimatedExpand open={!isPlanningSection} className='space-y-2'>
              <Label htmlFor='manager' required>
                Manager
              </Label>
              <ManagerSwitcher
                managers={managers}
                value={managerId}
                onChange={setManagerId}
                divisionId={divisionId}
                disabled={isCreating}
                placeholder='Select or create manager'
              />
            </AnimatedExpand>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isCreating || !canSubmit}>
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Section'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
