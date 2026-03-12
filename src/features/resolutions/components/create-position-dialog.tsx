'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createPosition } from '@/lib/actions'
import { toast } from '@/hooks/use-toast'

export default function CreatePositionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    committeeYear: new Date().getFullYear().toString(),
    isActive: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createPosition({
        title: formData.title,
        description: formData.description || undefined,
        committeeYear: parseInt(formData.committeeYear),
        isActive: formData.isActive,
      })

      if (result.status === 'ok') {
        toast({
          title: 'Success',
          description: 'Position created successfully',
        })
        onOpenChange(false)
        setFormData({
          title: '',
          description: '',
          committeeYear: new Date().getFullYear().toString(),
          isActive: true,
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create position',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Executive Position</DialogTitle>
          <DialogDescription>
            Create a new position for the executive committee. Members can be
            nominated for this position.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='title' required>Position Title</Label>
            <Input
              id='title'
              value={formData.title}
              onChange={e =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder='e.g., President, Secretary, Treasurer'
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description (Optional)</Label>
            <Textarea
              id='description'
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder='Brief description of responsibilities...'
              rows={3}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='committeeYear' required>Committee Year</Label>
            <Input
              id='committeeYear'
              type='number'
              value={formData.committeeYear}
              onChange={e =>
                setFormData({ ...formData, committeeYear: e.target.value })
              }
              min='2000'
              max='2100'
              required
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={
                loading ||
                !formData.title.trim() ||
                !formData.committeeYear.trim()
              }
            >
              {loading ? 'Creating...' : 'Create Position'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
