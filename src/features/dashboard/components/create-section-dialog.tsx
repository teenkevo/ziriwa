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
import { ManagerSwitcher } from './manager-switcher'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  order?: number
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
  divisionName: string
  managers: StaffMember[]
  onSuccess?: (section: Section) => void
}

export function CreateSectionDialog({
  open,
  onOpenChange,
  divisionId,
  divisionName,
  managers,
  onSuccess,
}: CreateSectionDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [name, setName] = React.useState('')
  const [managerId, setManagerId] = React.useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !managerId) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          divisionId,
          managerId,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Add a new section to {divisionName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='sectionName' required>
                Section Name
              </Label>
              <Input
                id='sectionName'
                placeholder='e.g. Data Science, Data Engineering'
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='manager' required>
                Manager
              </Label>
              <ManagerSwitcher
                managers={managers}
                value={managerId}
                onChange={setManagerId}
                disabled={isCreating}
                placeholder='Select or create manager'
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
              disabled={isCreating || !name.trim() || !managerId}
            >
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
