'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { format } from 'date-fns'

type Resolution = {
  _id: string
  title: string
  resolutionType: string
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

export default function ResolutionResults({
  resolution,
}: {
  resolution: Resolution
}) {
  const votes = resolution.votes || []
  const isExecutiveCommittee =
    resolution.resolutionType === 'executive_committee'

  if (isExecutiveCommittee && resolution.nominations) {
    // Group votes by position and nominee
    const votesByPosition = votes.reduce(
      (acc, vote) => {
        if (!vote.nomination) return acc

        const posId = vote.nomination.position._id
        const nomId = vote.nomination._id

        if (!acc[posId]) acc[posId] = {}
        if (!acc[posId][nomId]) {
          acc[posId][nomId] = {
            nomination: vote.nomination,
            votes: [],
          }
        }
        acc[posId][nomId].votes.push(vote)
        return acc
      },
      {} as Record<
        string,
        Record<
          string,
          {
            nomination: NonNullable<(typeof votes)[0]['nomination']>
            votes: typeof votes
          }
        >
      >,
    )

    // Group nominations by position
    const nominationsByPosition = resolution.nominations.reduce(
      (acc, nom) => {
        const posId = nom.position._id
        if (!acc[posId]) acc[posId] = []
        acc[posId].push(nom)
        return acc
      },
      {} as Record<string, typeof resolution.nominations>,
    )

    return (
      <div className='space-y-6'>
        {Object.entries(nominationsByPosition).map(
          ([positionId, nominations]) => {
            const positionVotes = votesByPosition[positionId] || {}
            const totalVotes = Object.values(positionVotes).reduce(
              (sum, n) => sum + n.votes.length,
              0,
            )

            // Sort nominations by vote count
            const sortedNominations = nominations
              .map(nom => ({
                nomination: nom,
                voteCount: positionVotes[nom._id]?.votes.length || 0,
              }))
              .sort((a, b) => b.voteCount - a.voteCount)

            return (
              <Card key={positionId}>
                <CardHeader>
                  <CardTitle>{nominations[0]?.position.title}</CardTitle>
                  <CardDescription>
                    {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {sortedNominations.map(({ nomination, voteCount }) => {
                    const percentage =
                      totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                    const isWinner =
                      sortedNominations[0].voteCount === voteCount &&
                      voteCount > 0

                    return (
                      <div key={nomination._id} className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>
                              {nomination.nominee.fullName}
                            </span>
                            {isWinner && (
                              <Badge variant='default' className='gap-1'>
                                <CheckCircle2 className='h-3 w-3' />
                                Leading
                              </Badge>
                            )}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {voteCount} vote{voteCount !== 1 ? 's' : ''} (
                            {percentage.toFixed(1)}%)
                          </div>
                        </div>
                        <Progress value={percentage} className='h-2' />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          },
        )}
      </div>
    )
  }

  // General resolution results
  const forVotes = votes.filter(v => v.voteType === 'for')
  const againstVotes = votes.filter(v => v.voteType === 'against')
  const abstainVotes = votes.filter(v => v.voteType === 'abstain')
  const totalVotes = votes.length

  const forPercentage =
    totalVotes > 0 ? (forVotes.length / totalVotes) * 100 : 0
  const againstPercentage =
    totalVotes > 0 ? (againstVotes.length / totalVotes) * 100 : 0
  const abstainPercentage =
    totalVotes > 0 ? (abstainVotes.length / totalVotes) * 100 : 0

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Voting Summary</CardTitle>
          <CardDescription>
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-green-600' />
                <span className='font-medium'>For</span>
              </div>
              <div className='text-sm text-muted-foreground'>
                {forVotes.length} vote{forVotes.length !== 1 ? 's' : ''} (
                {forPercentage.toFixed(1)}%)
              </div>
            </div>
            <Progress value={forPercentage} className='h-2' />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <XCircle className='h-4 w-4 text-red-600' />
                <span className='font-medium'>Against</span>
              </div>
              <div className='text-sm text-muted-foreground'>
                {againstVotes.length} vote{againstVotes.length !== 1 ? 's' : ''}{' '}
                ({againstPercentage.toFixed(1)}%)
              </div>
            </div>
            <Progress value={againstPercentage} className='h-2' />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <MinusCircle className='h-4 w-4 text-gray-600' />
                <span className='font-medium'>Abstain</span>
              </div>
              <div className='text-sm text-muted-foreground'>
                {abstainVotes.length} vote{abstainVotes.length !== 1 ? 's' : ''}{' '}
                ({abstainPercentage.toFixed(1)}%)
              </div>
            </div>
            <Progress value={abstainPercentage} className='h-2' />
          </div>
        </CardContent>
      </Card>

      {totalVotes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vote Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {votes.map(vote => (
                <div
                  key={vote._id}
                  className='flex items-center justify-between p-2 border rounded-md text-sm'
                >
                  <div>
                    <span className='font-medium'>{vote.voter.fullName}</span>
                    <span className='text-muted-foreground ml-2'>
                      ({vote.voter.memberId})
                    </span>
                  </div>
                  <Badge
                    variant={
                      vote.voteType === 'for'
                        ? 'default'
                        : vote.voteType === 'against'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {vote.voteType}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
