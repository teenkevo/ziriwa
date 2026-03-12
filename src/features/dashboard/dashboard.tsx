'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RecentSales } from './components/recent-sales'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { Repository } from './components/repository'
import { ALL_MEMBERS_QUERYResult } from '../../../sanity.types'
import PositionsList from '@/features/resolutions/components/positions-list'
import CreatePositionDialog from '@/features/resolutions/components/create-position-dialog'
import { CreateSectionDialog } from './components/create-section-dialog'
import type { Section } from './components/create-section-dialog'
import type { StaffMember } from './components/create-section-dialog'

type Division = {
  _id: string
  name: string
} | null

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
}

export default function DashboardPage({
  members,
  positions = [],
  sections = [],
  division,
  managers = [],
}: {
  members: ALL_MEMBERS_QUERYResult
  positions?: Position[]
  sections?: Section[]
  division?: Division
  managers?: StaffMember[]
}) {
  const [showCreatePosition, setShowCreatePosition] = useState(false)
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [activeTab, setActiveTab] = useState('sections')

  const canCreateSection = !!division
  const divisionName = division?.name ?? 'the current division'

  // Convert members to the format expected by PositionsList
  const positionsListMembers: Member[] = members
    .filter(member => member._id && member.fullName && member.memberId)
    .map(member => ({
      _id: member._id!,
      fullName: member.fullName!,
      memberId: member.memberId!,
    }))
  const recentPayments = members.slice(0, 5).map(member => ({
    id: member._id || '',
    memberId: member.memberId || '',
    fullName: member.fullName || '',
    email: member.email || '',
    amount: member.payments[0]?.amountPaid || 0,
    description: member.payments[0]?.description || '', // Note: description is same as amount, might be a bug
    date: member.payments[0]?.paymentDate || '',
  }))

  return (
    <>
      <div className='flex-col md:flex'>
        <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
          <Tabs
            defaultValue='sections'
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-4'
          >
            <div className='flex items-center justify-between gap-4'>
              <TabsList>
                <TabsTrigger value='sections'>Sections</TabsTrigger>
                <TabsTrigger value='executive-committee'>Executive</TabsTrigger>
                <TabsTrigger value='reports' disabled>
                  Reports
                </TabsTrigger>
              </TabsList>
              {activeTab === 'sections' && canCreateSection && (
                <Button
                  variant='outline'
                  onClick={() => setShowCreateSection(true)}
                >
                  <Plus className='h-4 w-4' />
                  Create Section
                </Button>
              )}
              {activeTab === 'executive-committee' && (
                <Button onClick={() => setShowCreatePosition(true)}>
                  <Plus className='h-4 w-4' />
                  Create Position
                </Button>
              )}
            </div>
            <TabsContent value='sections' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                {sections.map(section => (
                  <Card
                    key={section._id}
                    className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
                  >
                    <Link
                      href={`/sections/${section.slug?.current ?? section._id}`}
                      prefetch={false}
                    >
                      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-xs font-medium text-muted-foreground'>
                          Section
                        </CardTitle>
                        <FolderOpen className='h-5 w-5 text-primary' />
                      </CardHeader>
                      <CardContent>
                        <div className='text-2xl font-bold'>{section.name}</div>
                        <p className='text-xs text-muted-foreground'>
                          View contract progress
                        </p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
                {canCreateSection && (
                  <Card
                    className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
                    onClick={() => setShowCreateSection(true)}
                  >
                    <CardContent className='flex flex-col items-center justify-center pt-6'>
                      <Plus className='h-10 w-10 text-primary mb-2' />
                      <p className='text-sm font-medium'>Create Section</p>
                      <p className='text-xs text-muted-foreground'>
                        Add a section to {divisionName}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value='executive-committee' className='space-y-4'>
              <PositionsList
                positions={positions}
                members={positionsListMembers}
              />
              <CreatePositionDialog
                open={showCreatePosition}
                onOpenChange={setShowCreatePosition}
              />
            </TabsContent>
          </Tabs>
          {canCreateSection && (
            <CreateSectionDialog
              open={showCreateSection}
              onOpenChange={setShowCreateSection}
              divisionId={division._id}
              divisionName={divisionName}
              managers={managers}
            />
          )}
        </div>
      </div>
    </>
  )
}
