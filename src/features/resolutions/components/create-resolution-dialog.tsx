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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createResolution } from '@/lib/actions'
import { toast } from '@/hooks/use-toast'

type Position = {
  _id: string
  title: string
  committeeYear: number
}

export default function CreateResolutionDialog({
  open,
  onOpenChange,
  positions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  positions: Position[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resolutionType: 'general',
    committeeYear: '',
    meetingDate: '',
    positionIds: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createResolution({
        title: formData.title,
        description: formData.description,
        resolutionType: formData.resolutionType,
        committeeYear: formData.committeeYear
          ? parseInt(formData.committeeYear)
          : undefined,
        meetingDate: formData.meetingDate,
        positionIds:
          formData.positionIds.length > 0 ? formData.positionIds : undefined,
      })

      if (result.status === 'ok') {
        toast({
          title: 'Success',
          description: 'Resolution created successfully',
        })
        onOpenChange(false)
        setFormData({
          title: '',
          description: '',
          resolutionType: 'general',
          committeeYear: '',
          meetingDate: '',
          positionIds: [],
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create resolution',
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

  const togglePosition = (positionId: string) => {
    setFormData(prev => ({
      ...prev,
      positionIds: prev.positionIds.includes(positionId)
        ? prev.positionIds.filter(id => id !== positionId)
        : [...prev.positionIds, positionId],
    }))
  }

  const executivePositions = positions.filter(
    p => formData.resolutionType === 'executive_committee',
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Create New Resolution</DialogTitle>
          <DialogDescription>
            Create a new resolution for an AGM meeting. You can open it for
            voting later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='title'>Resolution Title</Label>
            <Input
              id='title'
              value={formData.title}
              onChange={e =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder='e.g., Election of Executive Committee 2025'
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder='Describe what this resolution is about...'
              rows={4}
              required
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='resolutionType'>Resolution Type</Label>
              <Select
                value={formData.resolutionType}
                onValueChange={value =>
                  setFormData({ ...formData, resolutionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='executive_committee'>
                    Executive Committee Election
                  </SelectItem>
                  <SelectItem value='general'>General Resolution</SelectItem>
                  <SelectItem value='policy'>Policy Change</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='committeeYear'>Committee Year (Optional)</Label>
              <Input
                id='committeeYear'
                type='number'
                value={formData.committeeYear}
                onChange={e =>
                  setFormData({ ...formData, committeeYear: e.target.value })
                }
                placeholder='e.g., 2025'
                min='2000'
                max='2100'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='meetingDate'>Meeting Date</Label>
            <Input
              id='meetingDate'
              type='date'
              value={formData.meetingDate}
              onChange={e =>
                setFormData({ ...formData, meetingDate: e.target.value })
              }
              required
            />
          </div>

          {formData.resolutionType === 'executive_committee' &&
            executivePositions.length > 0 && (
              <div className='space-y-2'>
                <Label>Select Positions (Optional)</Label>
                <div className='border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto'>
                  {executivePositions.map(position => (
                    <label
                      key={position._id}
                      className='flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded'
                    >
                      <input
                        type='checkbox'
                        checked={formData.positionIds.includes(position._id)}
                        onChange={() => togglePosition(position._id)}
                        className='rounded'
                      />
                      <span className='text-sm'>
                        {position.title} ({position.committeeYear})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Creating...' : 'Create Resolution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
