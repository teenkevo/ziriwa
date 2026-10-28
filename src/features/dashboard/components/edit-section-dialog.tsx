'use client'

import * as React from 'react'
import { useServerRefresh } from '@/hooks/use-server-refresh'
import { Loader2 } from 'lucide-react'

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

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

interface EditSectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: {
    _id: string
    name: string
    slug?: { current: string }
    manager?: { _id: string }
    isPlanningSection?: boolean
  }
  divisionId: string
  divisionName: string
  divisionAcronym?: string
  managers: StaffMember[]
}

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  divisionId,
  divisionName,
  divisionAcronym,
  managers,
}: EditSectionDialogProps) {
  const { router, refresh: refreshRouter, runTransition } = useServerRefresh()
  const [isSaving, setIsSaving] = React.useState(false)
  const [name, setName] = React.useState('')
  const [managerId, setManagerId] = React.useState('')
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
    const planning = Boolean(section.isPlanningSection)
    setIsPlanningSection(planning)
    setName(planning ? planningName : section.name)
    setManagerId(planning ? '' : (section.manager?._id ?? ''))
  }, [open, section, planningName])

  const effectiveName = isPlanningSection ? planningName : name
  const canSubmit =
    Boolean(effectiveName.trim()) && (isPlanningSection || Boolean(managerId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/sections/${section._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: effectiveName.trim(),
          isPlanningSection,
          managerId: isPlanningSection ? null : managerId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update section')
      }
      const data = (await res.json()) as { slug?: string }
      if (data.slug && data.slug !== section.slug?.current) {
        await runTransition(() => {
          router.replace(`/sections/${data.slug}`)
        })
      } else {
        await refreshRouter()
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update section')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isSaving}>
        <DialogHeader>
          <DialogTitle>Edit section</DialogTitle>
          <DialogDescription>
            Update the section name, type, and manager.
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
                  if (planning) {
                    setManagerId('')
                    setName(planningName)
                  } else if (section.isPlanningSection) {
                    setName('')
                  } else {
                    setName(section.name)
                  }
                }}
                disabled={isSaving}
                className='grid gap-2'
              >
                <Label
                  htmlFor='edit-section-type-normal'
                  className='cursor-pointer rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40'
                >
                  <div className='flex items-center gap-3'>
                    <RadioGroupItem
                      value='normal'
                      id='edit-section-type-normal'
                    />
                    <span className='font-medium'>Normal section</span>
                  </div>
                  <p className='mt-0.5 pl-7 text-xs text-muted-foreground'>
                    Supervisors report to the section manager.
                  </p>
                </Label>
                <Label
                  htmlFor='edit-section-type-planning'
                  className='cursor-pointer rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40'
                >
                  <div className='flex items-center gap-3'>
                    <RadioGroupItem
                      value='planning'
                      id='edit-section-type-planning'
                    />
                    <span className='font-medium'>Planning section</span>
                  </div>
                  <p className='mt-0.5 pl-7 text-xs text-muted-foreground'>
                    Supervisors report directly to the Assistant Commissioner.
                    Name is inferred from the division.
                  </p>
                </Label>
              </RadioGroup>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editSectionName' required>
                Section name
              </Label>
              <Input
                id='editSectionName'
                value={isPlanningSection ? planningName : name}
                onChange={e => setName(e.target.value)}
                disabled={isSaving || isPlanningSection}
                required
              />
              <AnimatedExpand open={isPlanningSection} className='pt-1'>
                <p className='text-xs text-muted-foreground'>
                  Inferred as {planningName}.
                </p>
              </AnimatedExpand>
            </div>
            <AnimatedExpand open={!isPlanningSection} className='space-y-2'>
              <Label htmlFor='editSectionManager' required>
                Manager
              </Label>
              <ManagerSwitcher
                managers={managers}
                value={managerId}
                onChange={id => setManagerId(id || '')}
                disabled={isSaving}
                placeholder='Select or create manager'
                divisionId={divisionId}
                currentSectionId={section._id}
              />
            </AnimatedExpand>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !canSubmit}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
