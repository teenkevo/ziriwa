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
import { Checkbox } from '@/components/ui/checkbox'
import { AssistantCommissionerSwitcher } from './assistant-commissioner-switcher'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

type DivisionForEdit = {
  _id: string
  fullName?: string
  name: string
  acronym?: string
  isDefault?: boolean
  department?: { _id: string }
  assistantCommissioner?: { _id: string }
}

interface EditDivisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  division: DivisionForEdit
  assistantCommissioners: StaffMember[]
}

export function EditDivisionDialog({
  open,
  onOpenChange,
  division,
  assistantCommissioners,
}: EditDivisionDialogProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [acronym, setAcronym] = React.useState('')
  const [assistantCommissionerId, setAssistantCommissionerId] =
    React.useState<string>('')
  const [isDefault, setIsDefault] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setFullName(division.fullName ?? division.name ?? '')
    setAcronym(division.acronym ?? '')
    setAssistantCommissionerId(division.assistantCommissioner?._id ?? '')
    setIsDefault(!!division.isDefault)
  }, [open, division])

  const departmentId = division.department?._id ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/divisions/${division._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          acronym: acronym.trim() || null,
          assistantCommissionerId: assistantCommissionerId || null,
          isDefault,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update division')
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update division')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit division</DialogTitle>
          <DialogDescription>
            Update division details and assistant commissioner assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='editDivFullName' required>
                Full Division Name
              </Label>
              <Input
                id='editDivFullName'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editDivAcronym'>Acronym (optional)</Label>
              <Input
                id='editDivAcronym'
                value={acronym}
                onChange={e => setAcronym(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editDivAC'>Assistant Commissioner</Label>
              <AssistantCommissionerSwitcher
                assistantCommissioners={assistantCommissioners}
                value={assistantCommissionerId}
                onChange={id => setAssistantCommissionerId(id || '')}
                disabled={isSaving}
                placeholder='Select or create assistant commissioner'
                departmentId={departmentId}
              />
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='editDivDefault'
                checked={isDefault}
                onCheckedChange={v => setIsDefault(!!v)}
                disabled={isSaving}
              />
              <Label htmlFor='editDivDefault' className='font-normal text-sm'>
                Default division for this department
              </Label>
            </div>
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
            <Button type='submit' disabled={isSaving || !fullName.trim()}>
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
