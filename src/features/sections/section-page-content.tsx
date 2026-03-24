'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Handshake, FileBarChart, ArrowLeft, Zap } from 'lucide-react'
import { DueTodayThisWeek } from './components/due-today-this-week'
import { ContractTree } from './components/contract-tree'
import { OnboardContractDialog } from './components/onboard-contract-dialog'
import { StakeholderEngagementContent } from './stakeholder-engagement-content'
import { WeeklySprintContent } from './weekly-sprint-content'
import type { DueItem } from './components/due-today-this-week'
import type { SectionStaff } from '@/sanity/lib/staff/get-staff-by-section'
import {
  type SectionContract,
  flattenInitiatives,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { InitiativeWithActivities } from './weekly-sprint-content'

function flattenInitiativesWithActivities(
  contract: SectionContract | null,
): InitiativeWithActivities[] {
  if (!contract?.objectives) return []
  const out: InitiativeWithActivities[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      const key = init._key
      if (!key || !init.title) continue
      out.push({
        key,
        title: `${init.code ? init.code + ' – ' : ''}${init.title}`,
        activities: (init.measurableActivities ?? [])
          .filter(a => a._key && a.title)
          .map(a => ({ key: a._key, title: a.title })),
      })
    }
  }
  return out
}

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
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
  sprints?: WeeklySprint[]
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
  sprints = [],
}: SectionPageContentProps) {
  const [activeTab, setActiveTab] = useState('contract')
  const tabTriggers = [
    { value: 'contract', label: 'Contract', icon: FileText },
    { value: 'weekly-sprint', label: 'Weekly Sprint', icon: Zap },
    {
      value: 'stakeholder-engagements',
      label: 'Stakeholder engagements',
      icon: Handshake,
    },
    { value: 'reports', label: 'Reports', icon: FileBarChart },
  ] as const
  const [sprintSubTab, setSprintSubTab] = useState('draft')
  const [panelPortalNode, setPanelPortalNode] = useState<HTMLDivElement | null>(
    null,
  )
  const panelPortalRef = useCallback((node: HTMLDivElement | null) => {
    setPanelPortalNode(node)
  }, [])
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
            <Link
              href={
                section.division?.slug?.current
                  ? `/divisions/${section.division.slug.current}`
                  : '/dashboard'
              }
            >
              <ArrowLeft className='h-4 w-4 mr-1' />
              Back to Sections
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
                    <div className='text-sm flex items-center gap-2 text-muted-foreground'>
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

          <TabsContent value='weekly-sprint' className='space-y-4'>
            <WeeklySprintContent
              sectionId={section._id}
              sectionName={section.name}
              sprints={sprints}
              initiatives={flattenInitiativesWithActivities(sectionContract)}
              officers={officers}
              onSprintTabChange={setSprintSubTab}
              panelPortalNode={panelPortalNode}
            />
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

      {activeTab === 'weekly-sprint' && sprintSubTab === 'accepted' ? (
        <div
          ref={panelPortalRef}
          className='shrink-0 flex flex-col min-h-0 h-full'
        />
      ) : (
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
      )}
    </div>
  )
}
