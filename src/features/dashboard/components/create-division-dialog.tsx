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
import { AssistantCommissionerSwitcher } from './assistant-commissioner-switcher'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

interface CreateDivisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
  departmentName: string
  assistantCommissioners: StaffMember[]
}

export function CreateDivisionDialog({
  open,
  onOpenChange,
  departmentId,
  departmentName,
  assistantCommissioners,
}: CreateDivisionDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [fullName, setFullName] = React.useState('')
  const [acronym, setAcronym] = React.useState('')
  const [assistantCommissionerId, setAssistantCommissionerId] =
    React.useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          acronym: acronym.trim() || undefined,
          assistantCommissionerId: assistantCommissionerId || undefined,
          departmentId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create division')
      }
      const { id } = await res.json()
      setFullName('')
      setAcronym('')
      setAssistantCommissionerId('')
      onOpenChange(false)
      await fetch('/api/division/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Division</DialogTitle>
          <DialogDescription>
            Add a new division to {departmentName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='divFullName' required>
                Full Division Name
              </Label>
              <Input
                id='divFullName'
                placeholder='e.g. Data Innovations and Projects'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='divAcronym'>Acronym (optional)</Label>
              <Input
                id='divAcronym'
                placeholder='e.g. DIP'
                value={acronym}
                onChange={e => setAcronym(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='divAC' required>
                Assistant Commissioner
              </Label>
              <AssistantCommissionerSwitcher
                assistantCommissioners={assistantCommissioners}
                value={assistantCommissionerId}
                onChange={id => setAssistantCommissionerId(id || '')}
                disabled={isCreating}
                placeholder='Select or create assistant commissioner'
                departmentId={departmentId}
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
            <Button
              type='submit'
              disabled={
                isCreating || !fullName.trim() || !assistantCommissionerId
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Adding...
                </>
              ) : (
                'Add Division'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
