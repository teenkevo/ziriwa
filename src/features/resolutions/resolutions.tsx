'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, Users, Vote } from 'lucide-react'
import CreateResolutionDialog from './components/create-resolution-dialog'
import CreatePositionDialog from './components/create-position-dialog'
import ResolutionCard from './components/resolution-card'
import { format } from 'date-fns'

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
  status: string
}

export default function ResolutionsPage({
  resolutions,
  positions,
  members,
}: {
  resolutions: Resolution[]
  positions: Position[]
  members: Member[]
}) {
  const [showCreateResolution, setShowCreateResolution] = useState(false)
  const [showCreatePosition, setShowCreatePosition] = useState(false)

  const activeResolutions = resolutions.filter(r => r.status === 'open')
  const draftResolutions = resolutions.filter(r => r.status === 'draft')
  const closedResolutions = resolutions.filter(
    r =>
      r.status === 'closed' || r.status === 'passed' || r.status === 'rejected',
  )

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

  return (
    <div className='flex-col md:flex'>
      <div className='h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex'>
        <div className='md:flex items-center justify-between'>
          <div>
            <h1 className='md:text-3xl text-2xl font-bold tracking-tight'>
              Resolutions
            </h1>
            <p className='text-muted-foreground text-sm'>
              Manage AGM meetings, executive committee elections, and voting
            </p>
          </div>
          <div className='flex gap-2 mt-4 md:mt-0'>
            <Button
              onClick={() => setShowCreatePosition(true)}
              variant='outline'
            >
              <Plus className=' h-4 w-4' />
              Create Position
            </Button>
            <Button onClick={() => setShowCreateResolution(true)}>
              <Plus className=' h-4 w-4' />
              Create Resolution
            </Button>
          </div>
        </div>

        <Tabs defaultValue='active' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='active'>
              Active
              {activeResolutions.length > 0 && (
                <Badge variant='secondary' className='ml-2'>
                  {activeResolutions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='draft'>
              Draft
              {draftResolutions.length > 0 && (
                <Badge variant='secondary' className='ml-2'>
                  {draftResolutions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='closed'>
              Closed
              {closedResolutions.length > 0 && (
                <Badge variant='secondary' className='ml-2'>
                  {closedResolutions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='active' className='space-y-4'>
            {activeResolutions.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-12'>
                  <Vote className='h-12 w-12 text-muted-foreground mb-4' />
                  <h3 className='text-lg font-semibold mb-2'>
                    No Active Resolutions
                  </h3>
                  <p className='text-muted-foreground text-center mb-4'>
                    Create a new resolution to get started with voting
                  </p>
                  <Button onClick={() => setShowCreateResolution(true)}>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Resolution
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {activeResolutions.map(resolution => (
                  <ResolutionCard
                    key={resolution._id}
                    resolution={resolution}
                    members={members}
                    positions={positions}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value='draft' className='space-y-4'>
            {draftResolutions.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-12'>
                  <Calendar className='h-12 w-12 text-muted-foreground mb-4' />
                  <h3 className='text-lg font-semibold mb-2'>
                    No Draft Resolutions
                  </h3>
                  <p className='text-muted-foreground text-center'>
                    Draft resolutions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {draftResolutions.map(resolution => (
                  <ResolutionCard
                    key={resolution._id}
                    resolution={resolution}
                    members={members}
                    positions={positions}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value='closed' className='space-y-4'>
            {closedResolutions.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-12'>
                  <Calendar className='h-12 w-12 text-muted-foreground mb-4' />
                  <h3 className='text-lg font-semibold mb-2'>
                    No Closed Resolutions
                  </h3>
                  <p className='text-muted-foreground text-center'>
                    Closed resolutions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {closedResolutions.map(resolution => (
                  <ResolutionCard
                    key={resolution._id}
                    resolution={resolution}
                    members={members}
                    positions={positions}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateResolutionDialog
          open={showCreateResolution}
          onOpenChange={setShowCreateResolution}
          positions={positions}
        />

        <CreatePositionDialog
          open={showCreatePosition}
          onOpenChange={setShowCreatePosition}
        />
      </div>
    </div>
  )
}
