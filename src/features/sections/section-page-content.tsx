'use client'

import * as React from 'react'
import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  Handshake,
  FileBarChart,
  Zap,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Plus,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { useAppRole } from '@/hooks/use-app-role'
import { useOrgStructureAccess } from '@/hooks/use-org-structure-access'
import { EditSectionDialog } from '@/features/dashboard/components/edit-section-dialog'
import { DueTodayThisWeek } from './components/due-today-this-week'
import { ContractTree } from './components/contract-tree'
import { OnboardContractDialog } from './components/onboard-contract-dialog'
import { StakeholderEngagementContent } from './stakeholder-engagement-content'
import { WeeklySprintContent } from './weekly-sprint-content'
import { SectionDashboardContent } from './section-dashboard-content'
import { SectionStaffContent } from './section-staff-content'
import { SectionReportingContent } from './section-reporting-content'
import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'
import type { DueItem } from './components/due-today-this-week'
import type { SectionStaff } from '@/sanity/lib/staff/get-staff-by-section'
import {
  type SectionContract,
  flattenInitiatives,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { StaffMember } from '@/sanity/lib/staff/get-managers'
import type { InitiativeWithActivities } from './weekly-sprint-content'
import {
  useRegisterHeaderIdentity,
  useRegisterPageBreadcrumbs,
} from '@/contexts/app-breadcrumb-context'
import type { SectionAccess } from '@/lib/section-access'
import {
  scopeSprintsForViewer,
  shouldScopeSprintsToOfficer,
  shouldScopeSprintsToSupervisor,
  shouldUseOfficerContract,
} from '@/lib/sprint-workspace-scope'
import { DepartmentContractTree } from './components/department-contract-tree'
import { OnboardSupervisorContractDialog } from './components/onboard-supervisor-contract-dialog'
import type { SupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import type { OfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { OnboardOfficerContractDialog } from './components/onboard-officer-contract-dialog'
import { APP_ROLE_LABELS } from '@/lib/authz/types'

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

const SECTION_TAB_VALUES = [
  'dashboard',
  'contract',
  'weekly-sprint',
  'stakeholder-engagements',
  'staff',
  'reporting',
] as const

type SectionTab = (typeof SECTION_TAB_VALUES)[number]

function resolveSectionTabFromQuery(tab: string | null): SectionTab {
  if (tab && SECTION_TAB_VALUES.includes(tab as SectionTab)) {
    return tab as SectionTab
  }
  if (tab === 'detailed-tasks') return 'contract'
  return 'dashboard'
}

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
  manager?: { _id: string; fullName?: string }
}

type StaffOption = { _id: string; fullName?: string; staffId?: string }

export interface SectionPageContentProps {
  section: Section
  sectionContract: SectionContract | null
  supervisorContract?: SupervisorContract | null
  officerContract?: OfficerContract | null
  stakeholderEngagement: StakeholderEngagement | null
  staffOptions: StaffOption[]
  supervisors: SectionStaff[]
  officers: SectionStaff[]
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
  dueThisMonth: DueItem[]
  dueThisQuarter: DueItem[]
  today: string
  sprints?: WeeklySprint[]
  /** Signed-in user’s Sanity staff id for this section (for officer sprint filtering). */
  viewerStaffId?: string
  sectionAccess: SectionAccess
  staffRoster: SectionStaffRoster
  /** Managers in this section’s division (edit section dialog). */
  managers: StaffMember[]
}

export function SectionPageContent({
  section,
  sectionContract,
  supervisorContract = null,
  officerContract = null,
  stakeholderEngagement,
  staffOptions,
  supervisors,
  officers,
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
  today,
  sprints = [],
  viewerStaffId,
  sectionAccess,
  staffRoster,
  managers,
}: SectionPageContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { role } = useAppRole()
  const { canCreateSection: allowSectionActions, isSuperadmin } =
    useOrgStructureAccess()
  const [showEditSection, setShowEditSection] = useState(false)
  const [showDeleteSection, setShowDeleteSection] = useState(false)
  const [deletingSection, setDeletingSection] = useState(false)

  const [activeTab, setActiveTab] = useState<SectionTab>(() =>
    resolveSectionTabFromQuery(searchParams.get('tab')),
  )
  const tabTriggers = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'contract', label: 'Contract', icon: FileText },
    { value: 'weekly-sprint', label: 'Sprints', icon: Zap },
    {
      value: 'stakeholder-engagements',
      label: 'Stakeholders',
      icon: Handshake,
    },
    { value: 'staff', label: 'Staff', icon: Users },
    { value: 'reporting', label: 'Reporting', icon: FileBarChart },
  ] as const

  React.useEffect(() => {
    setActiveTab(resolveSectionTabFromQuery(searchParams.get('tab')))
  }, [searchParams])

  const setSectionTab = React.useCallback(
    (value: string) => {
      const tab = resolveSectionTabFromQuery(value)
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'dashboard') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  /** Mirrors Weekly Sprint sub-tabs (Ready is default there). */
  const [sprintSubTab, setSprintSubTab] = useState('ready')
  const [panelPortalNode, setPanelPortalNode] = useState<HTMLDivElement | null>(
    null,
  )
  const panelPortalRef = useCallback((node: HTMLDivElement | null) => {
    setPanelPortalNode(node)
  }, [])
  const [onboardOpen, setOnboardOpen] = useState(false)
  const manager = section.manager
  const hasManager = !!manager?._id
  const scopedSprints = React.useMemo(
    () => scopeSprintsForViewer(sprints, sectionAccess),
    [sprints, sectionAccess],
  )
  const usesSupervisorContract =
    shouldScopeSprintsToSupervisor(sectionAccess) ||
    Boolean(
      sectionAccess.viewerStaffId &&
        supervisors.some(s => s._id === sectionAccess.viewerStaffId),
    )
  const usesOfficerContract =
    shouldUseOfficerContract(sectionAccess) ||
    Boolean(
      sectionAccess.viewerStaffId &&
        officers.some(o => o._id === sectionAccess.viewerStaffId),
    )
  const usesLeadershipContract = usesSupervisorContract || usesOfficerContract
  const activeContract = usesOfficerContract
    ? officerContract
    : usesSupervisorContract
      ? supervisorContract
      : sectionContract
  const currentFY =
    activeContract?.financialYearLabel ?? sectionContract?.financialYearLabel ?? 'current FY'
  const canManageActiveContract = usesOfficerContract
    ? sectionAccess.canManageOfficerContract ||
      sectionAccess.isSectionOfficer
    : usesSupervisorContract
      ? sectionAccess.canManageSupervisorContract ||
        sectionAccess.isSectionSupervisor
      : sectionAccess.canManageContract
  const leadershipContractsApi = usesOfficerContract
    ? 'officer-contracts'
    : 'supervisor-contracts'
  const viewerSupervisor = supervisors.find(s => s._id === viewerStaffId)
  const viewerOfficer = officers.find(s => s._id === viewerStaffId)
  const personalContractDisplayName = usesOfficerContract
    ? (viewerOfficer?.fullName ?? 'Officer')
    : (viewerSupervisor?.fullName ?? 'Supervisor')
  const showSprintSubTabs =
    !sectionAccess.isSectionOfficer &&
    (sectionAccess.canViewSprintDraftTab ||
      sectionAccess.canViewSprintInReviewTab)
  const [expandAllSignal, setExpandAllSignal] = useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = useState(0)
  /** Tracks bulk expand/collapse toggle label (tree may diverge if nodes toggled manually). */
  const [treeBulkExpanded, setTreeBulkExpanded] = useState(false)
  const [addObjectiveSignal, setAddObjectiveSignal] = useState(0)

  const breadcrumbItems = React.useMemo(() => {
    const out: { label: string; href?: string }[] = [
      { label: 'Departments', href: '/departments' },
    ]
    const divSlug = section.division?.slug?.current
    if (divSlug) {
      out.push({
        label: section.division?.name ?? 'Division',
        href: `/divisions/${divSlug}`,
      })
    }
    out.push({ label: section.name })
    return out
  }, [section])

  useRegisterPageBreadcrumbs(breadcrumbItems)

  const headerRoleLabel = React.useMemo(() => {
    if (sectionAccess.isSectionManager) return 'Manager'
    if (sectionAccess.isSectionSupervisor) return 'Supervisor'
    if (sectionAccess.isSectionOfficer) return 'Officer'
    if (isSuperadmin) return 'Administrator'
    return role ? APP_ROLE_LABELS[role] : null
  }, [role, sectionAccess, isSuperadmin])

  useRegisterHeaderIdentity(
    headerRoleLabel
      ? {
          roleLabel: headerRoleLabel,
          sectionLabel: section.name,
          separator: sectionAccess.isSectionOfficer ? '-' : '|',
        }
      : null,
  )

  const divisionSlug = section.division?.slug?.current

  const handleDeleteSection = async () => {
    setDeletingSection(true)
    try {
      const res = await fetch(`/api/sections/${section._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete section')
      }
      setShowDeleteSection(false)
      if (divisionSlug) {
        router.push(`/divisions/${divisionSlug}`)
      } else {
        router.push('/departments')
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete section')
    } finally {
      setDeletingSection(false)
    }
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row'>
      {/* Main column: scrolls independently; shell height is capped (h-svh + flex chain) */}
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold'>{section.name}</h1>
            <p className='text-muted-foreground'>
              {section.manager?.fullName &&
                `Manager: ${section.manager.fullName}`}
            </p>
          </div>
          {allowSectionActions && section.division?._id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size='sm' className='shrink-0'>
                  Actions
                  <ChevronDown className='h-4 w-4 ml-1 opacity-70' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => setShowEditSection(true)}>
                  <Pencil className='h-4 w-4 mr-2' />
                  Edit section
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => setShowDeleteSection(true)}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {allowSectionActions && section.division?._id && (
          <>
            <EditSectionDialog
              open={showEditSection}
              onOpenChange={setShowEditSection}
              section={section}
              divisionId={section.division._id}
              managers={managers}
            />
            <AlertDialog
              open={showDeleteSection}
              onOpenChange={setShowDeleteSection}
            >
              <AlertDialogContent disableClose={deletingSection}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete section?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will{' '}
                    <strong className='text-destructive'>
                      permanently delete
                    </strong>{' '}
                    &quot;{section.name}&quot; and all related performance
                    contracts, weekly sprints, stakeholder engagement data, and
                    uploaded files. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingSection}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={e => {
                      e.preventDefault()
                      handleDeleteSection()
                    }}
                    disabled={deletingSection}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    {deletingSection ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Deleting…
                      </>
                    ) : (
                      'Delete section'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setSectionTab}
          className='space-y-4'
        >
          <TabsList>
            {tabTriggers.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className='group'>
                <Icon className='h-4 w-4 mr-2 text-muted-foreground group-data-[state=active]:text-primary' />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value='dashboard' className='space-y-4'>
            <SectionDashboardContent
              sectionName={section.name}
              sectionSlug={section.slug?.current}
              contract={activeContract as SectionContract | null}
              sprints={sprints}
              sectionAccess={sectionAccess}
              workspaceBasePath={
                sectionAccess.isSectionOfficer ? '/officer' : '/manager'
              }
              engagement={stakeholderEngagement}
              dueToday={dueToday}
              dueThisWeek={dueThisWeek}
              dueThisMonth={dueThisMonth}
              dueThisQuarter={dueThisQuarter}
              today={today}
              onNavigateToTab={setSectionTab}
            />
          </TabsContent>
          <TabsContent value='contract' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                {activeContract ? (
                  <div className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='text-sm flex items-center gap-2 min-w-0'>
                        <FileText className='h-5 w-5 shrink-0' />
                        <span className='truncate'>{currentFY}</span>
                      </div>
                      <div className='flex flex-wrap items-center gap-2 sm:shrink-0'>
                        {canManageActiveContract ? (
                          <Button
                            type='button'
                            size='sm'
                            onClick={() => setAddObjectiveSignal(s => s + 1)}
                          >
                            <Plus className='h-4 w-4 mr-2' />
                            Add SSMARTA objective
                          </Button>
                        ) : null}
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            if (treeBulkExpanded) {
                              setCollapseAllSignal(s => s + 1)
                              setExpandAllSignal(0)
                              setTreeBulkExpanded(false)
                            } else {
                              setExpandAllSignal(s => s + 1)
                              setTreeBulkExpanded(true)
                            }
                          }}
                        >
                          {treeBulkExpanded ? (
                            <ChevronsUp className='h-4 w-4' />
                          ) : (
                            <ChevronsDown className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </div>
                    {usesLeadershipContract ? (
                      <DepartmentContractTree
                        departmentContract={
                          activeContract as SupervisorContract | OfficerContract
                        }
                        contractsApi={
                          leadershipContractsApi as
                            | 'supervisor-contracts'
                            | 'officer-contracts'
                        }
                        canManageContract={canManageActiveContract}
                        expandAllSignal={expandAllSignal}
                        collapseAllSignal={collapseAllSignal}
                        addObjectiveSignal={addObjectiveSignal}
                        onAddObjectiveRequestConsumed={() =>
                          setAddObjectiveSignal(0)
                        }
                      />
                    ) : (
                      <ContractTree
                        sectionContract={sectionContract!}
                        sectionSlug={section.slug?.current ?? ''}
                        canManageContract={canManageActiveContract}
                        expandAllSignal={expandAllSignal}
                        collapseAllSignal={collapseAllSignal}
                        addObjectiveSignal={addObjectiveSignal}
                        onAddObjectiveRequestConsumed={() =>
                          setAddObjectiveSignal(0)
                        }
                      />
                    )}
                  </div>
                ) : usesOfficerContract ? (
                  <div className='space-y-4'>
                    <OnboardOfficerContractDialog
                      open={onboardOpen}
                      onOpenChange={setOnboardOpen}
                      sectionId={section._id}
                      officerId={sectionAccess.viewerStaffId ?? undefined}
                      sectionName={section.name}
                      officerName={personalContractDisplayName}
                      onSuccess={() => setOnboardOpen(false)}
                    />
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <FileText className='h-5 w-5' />
                      <span>No officer contract for {currentFY}</span>
                    </div>
                    <p className='text-sm'>
                      Onboard your contract to add SSMARTA objectives,
                      initiatives, and measurable activities.
                    </p>
                    {sectionAccess.canManageOfficerContract ? (
                      <Button onClick={() => setOnboardOpen(true)}>
                        Onboard Contract
                      </Button>
                    ) : null}
                  </div>
                ) : usesSupervisorContract ? (
                  <div className='space-y-4'>
                    <OnboardSupervisorContractDialog
                      open={onboardOpen}
                      onOpenChange={setOnboardOpen}
                      sectionId={section._id}
                      supervisorId={sectionAccess.viewerStaffId ?? undefined}
                      sectionName={section.name}
                      supervisorName={personalContractDisplayName}
                      onSuccess={() => setOnboardOpen(false)}
                    />
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <FileText className='h-5 w-5' />
                      <span>No supervisor contract for {currentFY}</span>
                    </div>
                    <p className='text-sm'>
                      Onboard your contract to add SSMARTA objectives,
                      initiatives, and measurable activities.
                    </p>
                    {canManageActiveContract ? (
                      <Button onClick={() => setOnboardOpen(true)}>
                        Onboard Contract
                      </Button>
                    ) : null}
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
                    {sectionAccess.canOnboardContract && hasManager ? (
                      <Button onClick={() => setOnboardOpen(true)}>
                        Onboard Contract
                      </Button>
                    ) : sectionAccess.canOnboardContract ? null : (
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
            <SectionStaffContent
              sectionId={section._id}
              sectionName={section.name}
              roster={staffRoster}
              sectionAccess={sectionAccess}
            />
          </TabsContent>

          <TabsContent value='stakeholder-engagements' className='space-y-4'>
            <Card>
              <CardContent className='pt-6'>
                <StakeholderEngagementContent
                  sectionId={section._id}
                  sectionName={section.name}
                  engagement={stakeholderEngagement}
                  staffOptions={staffOptions}
                  initiatives={flattenInitiatives(
                    activeContract as SectionContract | null,
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='weekly-sprint' className='space-y-4'>
            <WeeklySprintContent
              sectionId={section._id}
              sectionName={section.name}
              sprints={scopedSprints}
              initiatives={flattenInitiativesWithActivities(
                activeContract as SectionContract | null,
              )}
              officers={officers}
              onSprintTabChange={setSprintSubTab}
              panelPortalNode={panelPortalNode}
              viewerStaffId={viewerStaffId}
              sectionAccess={sectionAccess}
            />
          </TabsContent>

          <TabsContent value='reporting' className='space-y-4'>
            <SectionReportingContent
              sectionName={section.name}
              sprints={scopedSprints}
            />
          </TabsContent>
        </Tabs>
      </div>

      {activeTab === 'stakeholder-engagements' ||
      activeTab === 'staff' ||
      activeTab === 'dashboard' ? null : (
        <div className='hidden h-full min-h-0 shrink-0 border-l bg-muted/20 lg:flex'>
          {activeTab === 'weekly-sprint' &&
          (sprintSubTab === 'ready' || !showSprintSubTabs) ? (
            <div
              ref={panelPortalRef}
              className='flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain lg:w-[24rem]'
            />
          ) : (
            <aside className='flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain lg:w-72'>
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
      )}
    </div>
  )
}
