'use client'

import * as React from 'react'
import { Loader2, PlusCircle } from 'lucide-react'
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

interface CreateDepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commissioners: StaffMember[]
}

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  commissioners,
}: CreateDepartmentDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [acronym, setAcronym] = React.useState('')
  const [commissionerId, setCommissionerId] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          acronym: acronym.trim() || undefined,
          commissionerId: commissionerId || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create department')
      }
      const { id } = await res.json()
      setFullName('')
      setAcronym('')
      setCommissionerId('')
      onOpenChange(false)
      await fetch('/api/department/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>Add a new department</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='createDeptFullName' required>
                Full Department Name
              </Label>
              <Input
                id='createDeptFullName'
                placeholder='e.g. Information Technology and Innovation Department'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='createDeptAcronym'>Acronym (optional)</Label>
              <Input
                id='createDeptAcronym'
                placeholder='e.g. ITID'
                value={acronym}
                onChange={e => setAcronym(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='createDeptCommissioner'>Commissioner</Label>
              <CommissionerSwitcher
                commissioners={commissioners}
                value={commissionerId}
                onChange={id => setCommissionerId(id || '')}
                disabled={isCreating}
                placeholder='Select or create commissioner'
              />
            </div>
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
            <Button type='submit' disabled={isCreating || !fullName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className='mr-2 h-4 w-4' />
                  Create Department
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
