'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Handshake, FileBarChart, ArrowLeft } from 'lucide-react'
import { DueTodayThisWeek } from './components/due-today-this-week'
import { ContractTree } from './components/contract-tree'
import { OnboardContractDialog } from './components/onboard-contract-dialog'
import { StakeholderEngagementContent } from './stakeholder-engagement-content'
import type { DueItem } from './components/due-today-this-week'
import type { SectionStaff } from '@/sanity/lib/staff/get-staff-by-section'
import {
  type SectionContract,
  flattenInitiatives,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  manager?: { _id: string; fullName?: string }
}

type StaffOption = { _id: string; fullName?: string; staffId?: string }

interface SectionPageContentProps {
  section: Section
  sectionContract: SectionContract | null
  stakeholderEngagement: StakeholderEngagement | null
  staffOptions: StaffOption[]
  supervisors: SectionStaff[]
  officers: SectionStaff[]
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
  dueThisMonth: DueItem[]
  dueThisQuarter: DueItem[]
}

export function SectionPageContent({
  section,
  sectionContract,
  stakeholderEngagement,
  staffOptions,
  supervisors,
  officers,
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
}: SectionPageContentProps) {
  const [activeTab, setActiveTab] = useState('contract')
  const tabTriggers = [
    { value: 'contract', label: 'Contract', icon: FileText },
    { value: 'stakeholder-engagements', label: 'Stakeholder engagements', icon: Handshake },
    { value: 'reports', label: 'Reports', icon: FileBarChart },
  ] as const
  const [onboardOpen, setOnboardOpen] = useState(false)
  const currentFY = sectionContract?.financialYearLabel ?? 'current FY'
  const manager = section.manager
  const hasManager = !!manager?._id

  return (
    <div className='flex flex-1 min-h-0 overflow-hidden lg:h-[calc(100vh-5rem)]'>
      {/* Main content - left scroll area */}
      <div className='flex flex-col flex-1 gap-6 p-4 md:p-8 pt-6 min-w-0 overflow-y-auto overscroll-contain'>
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
          <TabsList>
            {tabTriggers.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon className='h-4 w-4 mr-2' />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value='contract' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                {sectionContract ? (
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <FileText className='h-5 w-5' />
                      <span>Contract for {currentFY}</span>
                    </div>
                    <ContractTree
                      sectionContract={sectionContract}
                      sectionSlug={section.slug?.current ?? ''}
                    />
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

          <TabsContent value='stakeholder-engagements' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                <StakeholderEngagementContent
                  sectionId={section._id}
                  sectionName={section.name}
                  engagement={stakeholderEngagement}
                  staffOptions={staffOptions}
                  initiatives={flattenInitiatives(sectionContract)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='reports' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center gap-2 text-muted-foreground mb-4'>
                  <FileBarChart className='h-5 w-5' />
                  <span>Reports</span>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Reports will be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right scroll area - Due Today / Due This Week */}
      <aside className='w-full lg:w-72 shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
        <div className='p-4 md:p-6'>
          <DueTodayThisWeek
            dueToday={dueToday}
            dueThisWeek={dueThisWeek}
            dueThisMonth={dueThisMonth}
            dueThisQuarter={dueThisQuarter}
          />
        </div>
      </aside>
    </div>
  )
}
