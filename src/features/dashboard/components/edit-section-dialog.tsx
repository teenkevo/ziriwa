'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONTRACT_ALIGNMENT_LABELS,
  parseContractAlignment,
  type ContractAlignment,
} from '@/lib/contract-alignment'
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
    contractAlignment?: ContractAlignment | string
  }
  divisionId: string
  managers: StaffMember[]
  /** Superadmin-only: change ITIL 4 vs PMS alignment for future FY contracts. */
  canEditContractAlignment?: boolean
}

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  divisionId,
  managers,
  canEditContractAlignment = false,
}: EditSectionDialogProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)
  const [name, setName] = React.useState('')
  const [managerId, setManagerId] = React.useState('')
  const [isPlanningSection, setIsPlanningSection] = React.useState(false)
  const [contractAlignment, setContractAlignment] =
    React.useState<ContractAlignment>('itil4')

  React.useEffect(() => {
    if (!open) return
    setName(section.name)
    setIsPlanningSection(Boolean(section.isPlanningSection))
    setManagerId(section.isPlanningSection ? '' : (section.manager?._id ?? ''))
    setContractAlignment(parseContractAlignment(section.contractAlignment))
  }, [open, section])

  const canSubmit =
    Boolean(name.trim()) && (isPlanningSection || Boolean(managerId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/sections/${section._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          isPlanningSection,
          managerId: isPlanningSection ? null : managerId,
          ...(canEditContractAlignment ? { contractAlignment } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update section')
      }
      const data = (await res.json()) as { slug?: string }
      onOpenChange(false)
      if (data.slug && data.slug !== section.slug?.current) {
        router.replace(`/sections/${data.slug}`)
      } else {
        router.refresh()
      }
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
            {canEditContractAlignment
              ? ' Contract alignment applies to newly onboarded financial-year contracts.'
              : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-1'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='editIsPlanningSection'
                  checked={isPlanningSection}
                  onCheckedChange={v => {
                    const checked = v === true
                    setIsPlanningSection(checked)
                    if (checked) setManagerId('')
                  }}
                  disabled={isSaving}
                />
                <Label
                  htmlFor='editIsPlanningSection'
                  className='text-sm font-semibold'
                >
                  Is this a planning section?
                </Label>
              </div>
              <p className='pl-6 text-xs text-muted-foreground'>
                Supervisors report directly to the Assistant Commissioner.
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editSectionName' required>
                Section name
              </Label>
              <Input
                id='editSectionName'
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            {!isPlanningSection ? (
              <div className='space-y-2'>
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
              </div>
            ) : null}
            {canEditContractAlignment ? (
              <div className='space-y-2'>
                <Label htmlFor='editContractAlignment'>
                  Contract alignment
                </Label>
                <Select
                  value={contractAlignment}
                  onValueChange={v =>
                    setContractAlignment(parseContractAlignment(v))
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger id='editContractAlignment'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='itil4'>
                      {CONTRACT_ALIGNMENT_LABELS.itil4}
                    </SelectItem>
                    <SelectItem value='pms'>
                      {CONTRACT_ALIGNMENT_LABELS.pms}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>
                  ITIL 4 contracts are aligned to the ITIL 4 framework. PMS
                  contracts are aligned to the newly developed PMS.
                </p>
              </div>
            ) : null}
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
