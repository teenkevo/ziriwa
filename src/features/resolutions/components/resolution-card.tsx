'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Vote, Eye } from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import VotingInterface from './voting-interface'
import ResolutionResults from './resolution-results'
import {
  openResolutionForVoting,
  closeResolution,
  getCurrentUserMemberIdByEmail,
} from '@/lib/actions'
import { toast } from '@/hooks/use-toast'

type Resolution = {
  _id: string
  title: string
  description: string
  resolutionType: string
  committeeYear?: number
  meetingDate: string
  status: string
  createdAt: string
  createdBy?: {
    _id: string
    fullName: string
    memberId: string
  }
  positions?: Array<{
    _id: string
    title: string
    description?: string
    committeeYear: number
    isActive: boolean
  }>
  votes?: Array<{
    _id: string
    voteType: string
    votedAt: string
    voter: {
      _id: string
      fullName: string
      memberId: string
    }
    nomination?: {
      _id: string
      nominee: {
        _id: string
        fullName: string
      }
      position: {
        _id: string
        title: string
      }
    }
  }>
  nominations?: Array<{
    _id: string
    status: string
    acceptedForVoting: boolean
    nominee: {
      _id: string
      fullName: string
      memberId: string
    }
    position: {
      _id: string
      title: string
    }
    nominatedBy: {
      _id: string
      fullName: string
    }
  }>
}

type Position = {
  _id: string
  title: string
  committeeYear: number
}

type Member = {
  _id: string
  fullName: string
  memberId: string
  status: string
}

export default function ResolutionCard({
  resolution,
  members,
  positions,
}: {
  resolution: Resolution
  members: Member[]
  positions: Position[]
}) {
  const router = useRouter()
  const { user } = useUser()
  const [showVoting, setShowVoting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    // Fetch current user's member ID when component mounts
    const fetchUserMemberId = async () => {
      if (user?.primaryEmailAddress?.emailAddress) {
        const memberId = await getCurrentUserMemberIdByEmail(
          user.primaryEmailAddress.emailAddress,
        )
        setCurrentUserMemberId(memberId)
      }
    }
    fetchUserMemberId()
  }, [user])

  const voteCount = resolution.votes?.length || 0
  const forVotes =
    resolution.votes?.filter(v => v.voteType === 'for').length || 0
  const againstVotes =
    resolution.votes?.filter(v => v.voteType === 'against').length || 0
  const abstainVotes =
    resolution.votes?.filter(v => v.voteType === 'abstain').length || 0

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      draft: 'outline',
      open: 'default',
      closed: 'secondary',
      passed: 'default',
      rejected: 'destructive',
    }
    return variants[status] || 'outline'
  }

  const handleOpenForVoting = async () => {
    setLoading(true)
    try {
      const result = await openResolutionForVoting(resolution._id)
      if (result.status === 'ok') {
        toast({
          title: 'Success',
          description: 'Resolution is now open for voting',
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to open resolution',
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

  const handleClose = async () => {
    setLoading(true)
    try {
      const result = await closeResolution(resolution._id)
      if (result.status === 'ok') {
        toast({
          title: 'Success',
          description: 'Resolution has been closed',
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to close resolution',
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
    <>
      <Card className='hover:shadow-lg transition-shadow'>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <CardTitle className='text-lg mb-2'>{resolution.title}</CardTitle>
              <CardDescription className='line-clamp-2'>
                {resolution.description}
              </CardDescription>
            </div>
            <Badge variant={getStatusBadge(resolution.status)} className='ml-2'>
              {resolution.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4 text-sm text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <Calendar className='h-4 w-4' />
              {format(new Date(resolution.meetingDate), 'MMM dd, yyyy')}
            </div>
            {resolution.committeeYear && (
              <div className='flex items-center gap-1'>
                <Users className='h-4 w-4' />
                {resolution.committeeYear}
              </div>
            )}
            {voteCount > 0 && (
              <div className='flex items-center gap-1'>
                <Vote className='h-4 w-4' />
                {voteCount} votes
              </div>
            )}
          </div>

          {resolution.status === 'open' && (
            <div className='pt-2 border-t'>
              <div className='flex gap-2'>
                <Button
                  onClick={() => setShowVoting(true)}
                  className='flex-1'
                  size='sm'
                >
                  <Vote className='mr-2 h-4 w-4' />
                  Vote
                </Button>
                <Button
                  onClick={() => setShowResults(true)}
                  variant='outline'
                  size='sm'
                >
                  <Eye className='mr-2 h-4 w-4' />
                  Results
                </Button>
              </div>
            </div>
          )}

          {resolution.status === 'draft' && (
            <div className='pt-2 border-t'>
              <Button
                onClick={handleOpenForVoting}
                className='w-full'
                size='sm'
                disabled={loading}
              >
                Open for Voting
              </Button>
            </div>
          )}

          {(resolution.status === 'closed' ||
            resolution.status === 'passed' ||
            resolution.status === 'rejected') && (
            <div className='pt-2 border-t'>
              <div className='flex gap-2'>
                <Button
                  onClick={() => setShowResults(true)}
                  variant='outline'
                  className='flex-1'
                  size='sm'
                >
                  <Eye className='mr-2 h-4 w-4' />
                  View Results
                </Button>
                {resolution.status === 'closed' && (
                  <Button
                    onClick={handleClose}
                    variant='outline'
                    size='sm'
                    disabled={loading}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}

          {resolution.status === 'open' && (
            <div className='pt-2 border-t'>
              <Button
                onClick={handleClose}
                variant='outline'
                className='w-full'
                size='sm'
                disabled={loading}
              >
                Close Voting
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showVoting} onOpenChange={setShowVoting}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>{resolution.title}</DialogDescription>
          </DialogHeader>
          <VotingInterface
            resolution={resolution}
            members={members}
            positions={positions}
            onVoteComplete={() => {
              setShowVoting(false)
              router.refresh()
            }}
            voterId={currentUserMemberId || undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Voting Results</DialogTitle>
            <DialogDescription>{resolution.title}</DialogDescription>
          </DialogHeader>
          <ResolutionResults resolution={resolution} />
        </DialogContent>
      </Dialog>
    </>
  )
}
