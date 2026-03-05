'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, ArrowLeft } from 'lucide-react'
import { DueTodayThisWeek } from './components/due-today-this-week'
import { ContractTree } from './components/contract-tree'
import { OnboardContractDialog } from './components/onboard-contract-dialog'
import type { DueItem } from './components/due-today-this-week'
import type { SectionStaff } from '@/sanity/lib/staff/get-staff-by-section'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  manager?: { _id: string; fullName?: string }
}

interface SectionPageContentProps {
  section: Section
  sectionContract: SectionContract | null
  supervisors: SectionStaff[]
  officers: SectionStaff[]
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
}

export function SectionPageContent({
  section,
  sectionContract,
  supervisors,
  officers,
  dueToday,
  dueThisWeek,
}: SectionPageContentProps) {
  const [activeTab, setActiveTab] = useState('contract')
  const [onboardOpen, setOnboardOpen] = useState(false)
  const currentFY = sectionContract?.financialYearLabel ?? 'current FY'
  const manager = section.manager
  const hasManager = !!manager?._id

  return (
    <div className='flex flex-col lg:flex-row flex-1 gap-6 p-4 md:p-8 pt-6'>
      {/* Main content */}
      <div className='flex-1 min-w-0'>
        <div className='mb-6'>
          <Button variant='ghost' size='sm' asChild className='mb-2 -ml-2'>
            <Link href='/dashboard'>
              <ArrowLeft className='h-4 w-4 mr-1' />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>{section.name}</h1>
          <p className='text-muted-foreground'>
            {section.manager?.fullName &&
              `Manager: ${section.manager.fullName}`}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='space-y-4'
        >
          <TabsContent value='contract' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                {sectionContract ? (
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <FileText className='h-5 w-5' />
                      <span>Contract for {currentFY}</span>
                    </div>
                    <ContractTree sectionContract={sectionContract} />
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <OnboardContractDialog
                      open={onboardOpen}
                      onOpenChange={setOnboardOpen}
                      sectionId={section._id}
                      managerId={manager?._id ?? ''}
                      sectionName={section.name}
                      managerName={manager?.fullName ?? '—'}
                      onSuccess={() => setOnboardOpen(false)}
                    />
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <FileText className='h-5 w-5' />
                      <span>No contract for {currentFY}</span>
                    </div>
                    <p className='text-sm'>
                      Onboard a contract to add SSMARTA objectives, initiatives,
                      and KPIs.
                    </p>
                    {hasManager ? (
                      <Button onClick={() => setOnboardOpen(true)}>
                        Onboard Contract
                      </Button>
                    ) : (
                      <p className='text-sm text-muted-foreground'>
                        Assign a manager to this section before onboarding a
                        contract.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='staff' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-muted-foreground mb-4'>
                  <Users className='h-5 w-5' />
                  <span>Section staff (Supervisors & Officers)</span>
                </div>
                <div className='space-y-6'>
                  <div>
                    <h3 className='text-sm font-medium mb-2'>Supervisors</h3>
                    {supervisors.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        No supervisors assigned to this section.
                      </p>
                    ) : (
                      <ul className='space-y-1'>
                        {supervisors.map(s => (
                          <li key={s._id} className='text-sm'>
                            {s.fullName}
                            {s.staffId && (
                              <span className='text-muted-foreground ml-1'>
                                ({s.staffId})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className='text-sm font-medium mb-2'>Officers</h3>
                    {officers.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        No officers assigned to this section.
                      </p>
                    ) : (
                      <ul className='space-y-1'>
                        {officers.map(o => (
                          <li key={o._id} className='text-sm'>
                            {o.fullName}
                            {o.staffId && (
                              <span className='text-muted-foreground ml-1'>
                                ({o.staffId})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar - Due Today / Due This Week */}
      <aside className='w-full lg:w-72 shrink-0'>
        <div className='lg:sticky lg:top-6'>
          <DueTodayThisWeek dueToday={dueToday} dueThisWeek={dueThisWeek} />
        </div>
      </aside>
    </div>
  )
}
