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
  }
  divisionId: string
  managers: StaffMember[]
}

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  divisionId,
  managers,
}: EditSectionDialogProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState(false)
  const [name, setName] = React.useState('')
  const [managerId, setManagerId] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName(section.name)
    setManagerId(section.manager?._id ?? '')
  }, [open, section])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !managerId) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/sections/${section._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          managerId,
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
        await router.refresh()
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit section</DialogTitle>
          <DialogDescription>
            Update the section name and manager.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
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
            <Button
              type='submit'
              disabled={isSaving || !name.trim() || !managerId}
            >
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
