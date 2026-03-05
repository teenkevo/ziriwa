'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { castVote } from '@/lib/actions'
import { toast } from '@/hooks/use-toast'
import { CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

type Resolution = {
  _id: string
  title: string
  resolutionType: string
  positions?: Array<{
    _id: string
    title: string
  }>
  nominations?: Array<{
    _id: string
    nominee: {
      _id: string
      fullName: string
      memberId: string
    }
    position: {
      _id: string
      title: string
    }
  }>
}

type Position = {
  _id: string
  title: string
}

type Member = {
  _id: string
  fullName: string
  memberId: string
  status: string
}

export default function VotingInterface({
  resolution,
  members,
  positions,
  onVoteComplete,
  voterId,
}: {
  resolution: Resolution
  members: Member[]
  positions: Position[]
  onVoteComplete: () => void
  voterId?: string
}) {
  const [loading, setLoading] = useState(false)
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [generalVote, setGeneralVote] = useState<string>('')
  const [selectedVoterId, setSelectedVoterId] = useState<string>(voterId || '')

  const isExecutiveCommittee =
    resolution.resolutionType === 'executive_committee'
  const resolutionPositions = resolution.positions || []

  // Group nominations by position, then deduplicate by nominee
  // For each nominee, keep only one nomination (the first one found)
  const nominationsByPosition =
    resolution.nominations?.reduce(
      (acc, nom) => {
        const posId = nom.position._id
        if (!acc[posId]) acc[posId] = []

        // Check if this nominee already exists for this position
        const nomineeExists = acc[posId].some(
          existingNom => existingNom.nominee._id === nom.nominee._id,
        )

        // Only add if nominee doesn't already exist for this position
        if (!nomineeExists) {
          acc[posId].push(nom)
        }

        return acc
      },
      {} as Record<string, typeof resolution.nominations>,
    ) || {}

  const handleSubmit = async () => {
    const currentVoterId = selectedVoterId || voterId

    if (!currentVoterId) {
      toast({
        title: 'Required',
        description: 'Please select a member to vote as',
        variant: 'destructive',
      })
      return
    }

    if (isExecutiveCommittee) {
      // For executive committee, we need votes for each position
      const positionIds = resolutionPositions.map(p => p._id)
      const allPositionsVoted = positionIds.every(posId => votes[posId])

      if (!allPositionsVoted) {
        toast({
          title: 'Incomplete',
          description: 'Please vote for all positions',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)
      try {
        // For executive committee, we'll create votes for each position
        // In a real implementation, you might want to batch these or create a special endpoint
        const votePromises = Object.entries(votes).map(
          ([positionId, nominationId]) => {
            return castVote({
              resolutionId: resolution._id,
              voterId: currentVoterId,
              voteType: 'for', // For executive committee, voting for a nominee is a "for" vote
              nominationId,
            })
          },
        )

        await Promise.all(votePromises)

        toast({
          title: 'Success',
          description: 'Your votes have been recorded',
        })
        onVoteComplete()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to submit votes',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else {
      // For general resolutions
      if (!generalVote) {
        toast({
          title: 'Required',
          description: 'Please select your vote',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)
      try {
        const result = await castVote({
          resolutionId: resolution._id,
          voterId: currentVoterId,
          voteType: generalVote as 'for' | 'against' | 'abstain',
        })

        if (result.status === 'ok') {
          toast({
            title: 'Success',
            description: 'Your vote has been recorded',
          })
          onVoteComplete()
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to submit vote',
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
  }

  const activeMembers = members.filter(m => m.status === 'active')

  if (isExecutiveCommittee && resolutionPositions.length > 0) {
    return (
      <div className='space-y-6'>
        <SignedOut>
          <Alert>
            <AlertDescription>
              <div className='space-y-2'>
                <p className='font-medium'>Sign in required</p>
                <p className='text-sm text-muted-foreground'>
                  You must be signed in to cast a vote. Please sign in to
                  continue.
                </p>
                <SignInButton mode='modal'>
                  <Button variant='default' className='mt-2'>
                    Sign In
                  </Button>
                </SignInButton>
              </div>
            </AlertDescription>
          </Alert>
        </SignedOut>

        <SignedIn>
          {!voterId && (
            <Alert>
              <AlertDescription>
                <div className='space-y-2'>
                  <Label htmlFor='voter-select'>Select Member Voting</Label>
                  <p className='text-sm text-muted-foreground'>
                    Your account is not linked to a member. Please select which
                    member you are voting as.
                  </p>
                  <Select
                    value={selectedVoterId}
                    onValueChange={setSelectedVoterId}
                  >
                    <SelectTrigger id='voter-select'>
                      <SelectValue placeholder='Select a member' />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map(member => (
                        <SelectItem key={member._id} value={member._id}>
                          {member.fullName} ({member.memberId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <p className='text-sm text-muted-foreground'>
            Please vote for each position by selecting a nominee. You must vote
            for all positions.
          </p>

          {resolutionPositions.map(position => {
            const nominations = nominationsByPosition[position._id] || []

            if (nominations.length === 0) {
              return (
                <Card key={position._id}>
                  <CardHeader>
                    <CardTitle>{position.title}</CardTitle>
                    <CardDescription>
                      No nominees available for this position
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            }

            return (
              <Card key={position._id}>
                <CardHeader>
                  <CardTitle>{position.title}</CardTitle>
                  <CardDescription>
                    Select a nominee for this position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={votes[position._id] || ''}
                    onValueChange={value =>
                      setVotes({ ...votes, [position._id]: value })
                    }
                  >
                    {nominations.map(nomination => (
                      <div
                        key={nomination._id}
                        className='flex items-center space-x-2 p-3 border rounded-md hover:bg-accent'
                      >
                        <RadioGroupItem
                          value={nomination._id}
                          id={nomination._id}
                        />
                        <Label
                          htmlFor={nomination._id}
                          className='flex-1 cursor-pointer'
                        >
                          <div className='font-medium'>
                            {nomination.nominee.fullName}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {nomination.nominee.memberId}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )
          })}

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              onClick={handleSubmit}
              disabled={loading || (!voterId && !selectedVoterId)}
            >
              {loading ? 'Submitting...' : 'Submit Votes'}
            </Button>
          </div>
        </SignedIn>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <SignedOut>
        <Alert>
          <AlertDescription>
            <div className='space-y-2'>
              <p className='font-medium'>Sign in required</p>
              <p className='text-sm text-muted-foreground'>
                You must be signed in to cast a vote. Please sign in to
                continue.
              </p>
              <SignInButton mode='modal'>
                <Button variant='default' className='mt-2'>
                  Sign In
                </Button>
              </SignInButton>
            </div>
          </AlertDescription>
        </Alert>
      </SignedOut>

      <SignedIn>
        {!voterId && (
          <Alert>
            <AlertDescription>
              <div className='space-y-2'>
                <Label htmlFor='voter-select'>Select Member Voting</Label>
                <p className='text-sm text-muted-foreground'>
                  Your account is not linked to a member. Please select which
                  member you are voting as.
                </p>
                <Select
                  value={selectedVoterId}
                  onValueChange={setSelectedVoterId}
                >
                  <SelectTrigger id='voter-select'>
                    <SelectValue placeholder='Select a member' />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map(member => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.fullName} ({member.memberId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <p className='text-sm text-muted-foreground'>
          Cast your vote on this resolution
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Your Vote</CardTitle>
            <CardDescription>
              Select your position on this resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={generalVote} onValueChange={setGeneralVote}>
              <div className='space-y-3'>
                <div className='flex items-center space-x-2 p-3 border rounded-md hover:bg-accent'>
                  <RadioGroupItem value='for' id='for' />
                  <Label htmlFor='for' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>For</div>
                    <div className='text-sm text-muted-foreground'>
                      I support this resolution
                    </div>
                  </Label>
                </div>
                <div className='flex items-center space-x-2 p-3 border rounded-md hover:bg-accent'>
                  <RadioGroupItem value='against' id='against' />
                  <Label htmlFor='against' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>Against</div>
                    <div className='text-sm text-muted-foreground'>
                      I oppose this resolution
                    </div>
                  </Label>
                </div>
                <div className='flex items-center space-x-2 p-3 border rounded-md hover:bg-accent'>
                  <RadioGroupItem value='abstain' id='abstain' />
                  <Label htmlFor='abstain' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>Abstain</div>
                    <div className='text-sm text-muted-foreground'>
                      I choose not to vote
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className='flex justify-end gap-2 pt-4 border-t'>
          <Button
            onClick={handleSubmit}
            disabled={loading || !generalVote || (!voterId && !selectedVoterId)}
          >
            {loading ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </div>
      </SignedIn>
    </div>
  )
}
