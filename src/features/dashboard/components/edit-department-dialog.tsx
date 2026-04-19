'use client'

import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
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
import { CommissionerSwitcher } from './commissioner-switcher'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

type Department = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  commissioner?: { _id: string }
}

interface EditDepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: Department | null
  commissioners: StaffMember[]
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  department,
  commissioners,
}: EditDepartmentDialogProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [acronym, setAcronym] = React.useState('')
  const [commissionerId, setCommissionerId] = React.useState('')

  React.useEffect(() => {
    if (!department || !open) return
    setFullName(department.fullName?.trim() ?? '')
    setAcronym(department.acronym?.trim() ?? '')
    setCommissionerId(department.commissioner?._id ?? '')
  }, [department, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department || !fullName.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/departments/${department._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          acronym: acronym.trim() || null,
          commissionerId: commissionerId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update department')
      }
      onOpenChange(false)
      await router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update department')
    } finally {
      setIsSaving(false)
    }
  }

  if (!department) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit department</DialogTitle>
          <DialogDescription>
            Update the department name, acronym, or commissioner assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='editDeptFullName' required>
                Full Department Name
              </Label>
              <Input
                id='editDeptFullName'
                placeholder='e.g. Information Technology and Innovation Department'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editDeptAcronym'>Acronym (optional)</Label>
              <Input
                id='editDeptAcronym'
                placeholder='e.g. ITID'
                value={acronym}
                onChange={e => setAcronym(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='editDeptCommissioner'>Commissioner</Label>
              <CommissionerSwitcher
                commissioners={commissioners}
                value={commissionerId}
                onChange={id => setCommissionerId(id || '')}
                disabled={isSaving}
                placeholder='Select or create commissioner'
              />
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
                <>
                  <Save className='mr-2 h-4 w-4' />
                  Save changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
