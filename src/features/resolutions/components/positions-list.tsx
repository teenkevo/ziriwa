'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Users, CheckCircle2, Loader2 } from 'lucide-react'
import CreateNominationDialog from './create-nomination-dialog'
import { useRouter } from 'next/navigation'
import { getCurrentUserMemberIdByEmail } from '@/lib/actions'

type Position = {
  _id: string
  title: string
  description?: string
  committeeYear: number
  isActive: boolean
  nominations?: Array<{
    _id: string
    status: string
    nominee: {
      _id: string
      fullName: string
      memberId: string
    }
    nominatedBy: {
      _id: string
      fullName: string
    }
  }>
}

type Member = {
  _id: string
  fullName: string
  memberId: string
  status?: string
  email?: string
}

export default function PositionsList({
  positions,
  members,
}: {
  positions: Position[]
  members: Member[]
}) {
  const router = useRouter()
  const { user } = useUser()
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<
    string | null
  >(null)
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(
    null,
  )
  const [isCheckingNomination, setIsCheckingNomination] = useState(true)

  const MAX_DESCRIPTION_LENGTH = 100

  useEffect(() => {
    // Get current user's member ID
    const fetchUserMemberId = async () => {
      if (!user) {
        setIsCheckingNomination(false)
        return
      }

      setIsCheckingNomination(true)
      if (user?.primaryEmailAddress?.emailAddress) {
        const memberId = await getCurrentUserMemberIdByEmail(
          user.primaryEmailAddress.emailAddress,
        )
        setCurrentUserMemberId(memberId)
      }
      setIsCheckingNomination(false)
    }
    fetchUserMemberId()
  }, [user])

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-12'>
          <Users className='h-12 w-12 text-muted-foreground mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No Positions Created</h3>
          <p className='text-muted-foreground text-center'>
            Create positions for the executive committee to enable nominations
            and voting
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group positions by year
  const positionsByYear = positions.reduce(
    (acc, position) => {
      const year = position.committeeYear
      if (!acc[year]) acc[year] = []
      acc[year].push(position)
      return acc
    },
    {} as Record<number, Position[]>,
  )

  const sortedYears = Object.keys(positionsByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className='space-y-6'>
      {sortedYears.map(year => (
        <div key={year} className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold'>Executive ({year})</h2>
          </div>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {positionsByYear[year].map(position => {
              const nominations = position.nominations || []
              // All nominations are automatically accepted, no filtering needed
              const acceptedNominations = nominations

              // Group nominations by nominee so each nominee appears once,
              // with multiple nominators listed together
              const nominationsByNominee = acceptedNominations.reduce(
                (
                  acc: Record<
                    string,
                    {
                      nominee: {
                        _id: string
                        fullName: string
                        memberId: string
                      }
                      nominatedBy: { _id: string; fullName: string }[]
                    }
                  >,
                  nomination,
                ) => {
                  const nomineeId = nomination.nominee._id
                  if (!acc[nomineeId]) {
                    acc[nomineeId] = {
                      nominee: nomination.nominee,
                      nominatedBy: [],
                    }
                  }
                  acc[nomineeId].nominatedBy.push(nomination.nominatedBy)
                  return acc
                },
                {},
              )
              const groupedNominees = Object.values(nominationsByNominee)

              // Check if current user has already nominated someone for this position
              const userHasNominated = currentUserMemberId
                ? nominations.some(
                    n => n.nominatedBy._id === currentUserMemberId,
                  )
                : false

              return (
                <Card key={position._id}>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <CardTitle className='text-lg'>
                          {position.title}
                        </CardTitle>
                        {position.description && (
                          <CardDescription className='mt-1'>
                            {position.description.length >
                            MAX_DESCRIPTION_LENGTH
                              ? `${position.description.substring(
                                  0,
                                  MAX_DESCRIPTION_LENGTH,
                                )}...`
                              : position.description}
                            {position.description.length >
                              MAX_DESCRIPTION_LENGTH && (
                              <Button
                                variant='link'
                                className='h-auto p-0 ml-1 text-xs'
                                onClick={() =>
                                  setExpandedDescriptionId(position._id)
                                }
                              >
                                Read more
                              </Button>
                            )}
                          </CardDescription>
                        )}
                      </div>
                      <Badge
                        variant={position.isActive ? 'default' : 'secondary'}
                      >
                        {position.isActive ? 'Active' : 'Closed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Nominations
                        </span>
                        <span className='font-medium'>
                          {groupedNominees.length}
                        </span>
                      </div>
                    </div>

                    {groupedNominees.length > 0 && (
                      <div className='space-y-2 pt-2 border-t'>
                        <div className='text-sm font-medium mb-2'>
                          Nominees:
                        </div>
                        {groupedNominees.map(group => (
                          <div
                            key={group.nominee._id}
                            className='flex items-center justify-between p-2 bg-accent rounded-md text-sm'
                          >
                            <div>
                              <div className='font-medium'>
                                {group.nominee.fullName}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                Nominated by {group.nominatedBy.length}{' '}
                                {group.nominatedBy.length === 1
                                  ? 'person'
                                  : 'people'}
                                :{' '}
                                {group.nominatedBy
                                  .map(n => n.fullName)
                                  .join(', ')}
                              </div>
                            </div>
                            <CheckCircle2 className='h-4 w-4 text-green-600' />
                          </div>
                        ))}
                      </div>
                    )}

                    {position.isActive && (
                      <Button
                        onClick={() => setSelectedPosition(position._id)}
                        className='w-full'
                        variant='outline'
                        size='sm'
                        disabled={isCheckingNomination || userHasNominated}
                      >
                        {isCheckingNomination ? (
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                          <Plus className='mr-2 h-4 w-4' />
                        )}
                        {isCheckingNomination
                          ? 'Checking for your nomination...'
                          : userHasNominated
                            ? 'You already nominated someone for this role'
                            : 'Nominate Someone'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      <CreateNominationDialog
        open={selectedPosition !== null}
        onOpenChange={open => !open && setSelectedPosition(null)}
        positionId={selectedPosition}
        members={members}
        positions={positions}
      />

      {expandedDescriptionId && (
        <Dialog
          open={expandedDescriptionId !== null}
          onOpenChange={open => !open && setExpandedDescriptionId(null)}
        >
          <DialogContent className='max-w-2xl max-h-[80vh]'>
            <DialogHeader>
              <DialogTitle>
                {positions.find(p => p._id === expandedDescriptionId)?.title}
              </DialogTitle>
              <DialogDescription>Position Description</DialogDescription>
            </DialogHeader>
            <div className='max-h-[60vh] overflow-y-auto pr-2'>
              <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                {
                  positions.find(p => p._id === expandedDescriptionId)
                    ?.description
                }
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
