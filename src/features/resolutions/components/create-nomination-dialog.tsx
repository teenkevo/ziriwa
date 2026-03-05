'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createNomination, getCurrentUserMemberIdByEmail } from '@/lib/actions'
import { toast } from '@/hooks/use-toast'

type Member = {
  _id: string
  fullName: string
  memberId: string
  status?: string
  email?: string
}

type Position = {
  _id: string
  title: string
  committeeYear: number
}

export default function CreateNominationDialog({
  open,
  onOpenChange,
  positionId,
  members,
  positions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  positionId: string | null
  members: Member[]
  positions: Position[]
}) {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nomineeId: '',
    nominatedById: '',
    notes: '',
  })

  const selectedPosition = positions.find(p => p._id === positionId)
  // Filter members to ensure they have required fields
  // Allow multiple nominations of the same candidate - only filter by required fields
  const availableMembers = members.filter(
    m => m._id && m.fullName && m.memberId,
  )

  useEffect(() => {
    if (!open) {
      setFormData({
        nomineeId: '',
        nominatedById: '',
        notes: '',
      })
    } else {
      // Auto-populate nominated by when dialog opens
      const autoPopulateNominatedBy = async () => {
        if (user?.primaryEmailAddress?.emailAddress) {
          try {
            const memberId = await getCurrentUserMemberIdByEmail(
              user.primaryEmailAddress.emailAddress,
            )
            if (memberId) {
              setFormData(prev => ({
                ...prev,
                nominatedById: memberId,
              }))
            }
          } catch (error) {
            console.error('Error getting current user member ID:', error)
          }
        }
      }
      autoPopulateNominatedBy()
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!positionId) return

    if (!formData.nomineeId || !formData.nominatedById) {
      toast({
        title: 'Required',
        description: 'Please select a nominee',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const result = await createNomination({
        positionId,
        nomineeId: formData.nomineeId,
        nominatedById: formData.nominatedById,
        notes: formData.notes || undefined,
      })

      if (result.status === 'ok') {
        toast({
          title: 'Success',
          description:
            'Nomination created successfully and is now available for voting.',
        })
        onOpenChange(false)
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create nomination',
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
          <DialogTitle>Create Nomination</DialogTitle>
          <DialogDescription>
            {selectedPosition
              ? `Nominate someone for ${selectedPosition.title} (${selectedPosition.committeeYear})`
              : 'Select a position first'}
          </DialogDescription>
        </DialogHeader>
        {selectedPosition && (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='nominee'>Nominee</Label>
              <Select
                value={formData.nomineeId}
                onValueChange={value =>
                  setFormData({ ...formData, nomineeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a member to nominate' />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className='px-2 py-1.5 text-sm text-muted-foreground'>
                      No members available
                    </div>
                  ) : (
                    availableMembers.map(member => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.fullName} ({member.memberId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='notes'>Notes (Optional)</Label>
              <Textarea
                id='notes'
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder='Any additional notes about this nomination...'
                rows={3}
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
              <Button type='submit' disabled={loading}>
                {loading ? 'Creating...' : 'Create Nomination'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
