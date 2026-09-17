'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  Building,
  Building2,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FilePen,
  FileText,
  GraduationCap,
  Handshake,
  Landmark,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { ProjectAdminSidebarNav } from '@/components/project-admin-sidebar-nav'
import { SectionLeadershipSidebarNav } from '@/components/section-leadership-sidebar-nav'
import { SidebarContractGatedItem } from '@/components/sidebar-contract-gated-item'
import { SprintTabSidebarLink } from '@/components/sprint-tab-sidebar-link'
import { buildSprintTabHref } from '@/lib/sprint-tab-href'
import type { SprintNavCounts } from '@/lib/sprint-nav-counts'
import type {
  SidebarDepartmentWithDivisions,
  SidebarDivision,
} from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'

export type SidebarSection = {
  _id: string
  name: string
  slug?: { current?: string }
}

function resolveManagerSprintTab(
  tab: string | null,
): 'ready' | 'to-review' | 'drafts' {
  if (tab === 'to-review' || tab === 'drafts') return tab
  return 'ready'
}

function resolveOfficerSprintTab(
  tab: string | null,
): 'ready' | 'drafts' {
  return tab === 'drafts' ? 'drafts' : 'ready'
}

function SprintSidebarCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <SidebarMenuBadge>
      {count > 99 ? '99+' : count}
    </SidebarMenuBadge>
  )
}

export function AppSidebarNav({
  departmentsTree,
  variant = 'default',
  commissionerDivisions = [],
  assistantCommissionerSections = [],
  managerSprintsReviewLabel = 'To Review',
  sprintNavCounts,
  hideSprintReviewTab = false,
  showWorkstreamsNav = false,
  useProjectMembersNav = false,
  staffNavLabel,
  sprintsNavMode,
  workspaceBasePath,
  contractUnlocked = true,
}: {
  departmentsTree: SidebarDepartmentWithDivisions[]
  workspaceBasePath?: string
  variant?:
    | 'default'
    | 'commissioner'
    | 'assistant-commissioner'
    | 'manager'
    | 'supervisor'
    | 'officer'
    | 'project-admin'
  commissionerDivisions?: SidebarDivision[]
  assistantCommissionerSections?: SidebarSection[]
  managerSprintsReviewLabel?: string
  sprintNavCounts?: SprintNavCounts
  hideSprintReviewTab?: boolean
  showWorkstreamsNav?: boolean
  useProjectMembersNav?: boolean
  staffNavLabel?: string
  /** When false, only Dashboard and Contract stay clickable. */
  contractUnlocked?: boolean
  /** PM/DPM: ready-only. Workstream member: split Ready/Drafts. Section officer: single link. */
  sprintsNavMode?: 'split' | 'ready-only' | 'single'
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sectionDivisionId, setSectionDivisionId] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    const m = pathname.match(/^\/sections\/([^/]+)/)
    if (!m) {
      setSectionDivisionId(null)
      return
    }
    const slug = decodeURIComponent(m[1])
    const ac = new AbortController()
    fetch(`/api/sections/by-slug/${encodeURIComponent(slug)}`, {
      signal: ac.signal,
    })
      .then(r => {
        if (!r.ok) {
          setSectionDivisionId(null)
          return null
        }
        return r.json() as Promise<{ division?: { _id: string } | null }>
      })
      .then(data => {
        if (data?.division?._id) setSectionDivisionId(data.division._id)
        else if (data !== null) setSectionDivisionId(null)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setSectionDivisionId(null)
      })
    return () => ac.abort()
  }, [pathname])

  const autoOpenDeptIds = React.useMemo(() => {
    const ids = new Set<string>()
    const deptPath = pathname.match(/^\/departments\/([^/]+)/)
    if (deptPath?.[1]) {
      const slug = decodeURIComponent(deptPath[1])
      const d = departmentsTree.find(
        x => x.slug?.current === slug || x._id === slug,
      )
      if (d) ids.add(d._id)
    }
    const divPath = pathname.match(/^\/divisions\/([^/]+)/)
    if (divPath?.[1]) {
      const slug = decodeURIComponent(divPath[1])
      for (const d of departmentsTree) {
        if (
          d.divisions.some(
            div => div.slug?.current === slug || div._id === slug,
          )
        ) {
          ids.add(d._id)
          break
        }
      }
    }
    if (sectionDivisionId) {
      for (const d of departmentsTree) {
        if (d.divisions.some(div => div._id === sectionDivisionId)) {
          ids.add(d._id)
          break
        }
      }
    }
    return ids
  }, [pathname, departmentsTree, sectionDivisionId])

  const [openDeptIds, setOpenDeptIds] = React.useState<Set<string>>(
    () => new Set(),
  )

  React.useEffect(() => {
    setOpenDeptIds(prev => {
      const next = new Set(prev)
      autoOpenDeptIds.forEach(id => next.add(id))
      return next
    })
  }, [autoOpenDeptIds])

  const departmentsNavActive =
    pathname === '/departments' || pathname.startsWith('/departments/')
  const isCommissionerSidebar = variant === 'commissioner'
  const isAssistantCommissionerSidebar = variant === 'assistant-commissioner'
  const isManagerSidebar = variant === 'manager'
  const isSupervisorSidebar = variant === 'supervisor'
  const isProjectAdminSidebar = variant === 'project-admin'
  const isOfficerSidebar = variant === 'officer'
  const adminBasePath = workspaceBasePath ?? '/projects'
  const officerBasePath = workspaceBasePath ?? '/officer'
  const managerBasePath = workspaceBasePath ?? '/manager'
  const supervisorBasePath = workspaceBasePath ?? '/supervisor'
  const sectionLeadershipSprintTab =
    isManagerSidebar || isSupervisorSidebar
      ? resolveManagerSprintTab(searchParams.get('tab'))
      : null
  const sprintCounts = sprintNavCounts ?? {
    ready: 0,
    inReview: 0,
    drafts: 0,
  }
  const leadershipSprintsNavMode =
    sprintsNavMode === 'ready-only' ? 'ready-only' : 'split'
  const officerSprintsSplit = sprintsNavMode === 'split'
  const officerSprintTab = resolveOfficerSprintTab(searchParams.get('tab'))
  const isOfficerSprintsRoute =
    pathname === `${officerBasePath}/sprints` ||
    pathname.startsWith(`${officerBasePath}/sprints/`)

  if (isProjectAdminSidebar) {
    return <ProjectAdminSidebarNav adminBasePath={adminBasePath} />
  }

  if (isOfficerSidebar) {
    return (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === `${officerBasePath}/dashboard` ||
                    pathname.startsWith(`${officerBasePath}/dashboard/`)
                  }
                >
                  <Link href={`${officerBasePath}/dashboard`}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === `${officerBasePath}/contract` ||
                    pathname.startsWith(`${officerBasePath}/contract/`)
                  }
                >
                  <Link href={`${officerBasePath}/contract`}>
                    <FileText />
                    <span>Contract</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${officerBasePath}/stakeholders`}
                isActive={
                  pathname === `${officerBasePath}/stakeholders` ||
                  pathname.startsWith(`${officerBasePath}/stakeholders/`)
                }
              >
                <Handshake />
                <span>Stakeholders</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${officerBasePath}/board-actions`}
                isActive={
                  pathname === `${officerBasePath}/board-actions` ||
                  pathname.startsWith(`${officerBasePath}/board-actions/`)
                }
              >
                <ClipboardList />
                <span>Board Actions</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${officerBasePath}/audit-queries`}
                isActive={
                  pathname === `${officerBasePath}/audit-queries` ||
                  pathname.startsWith(`${officerBasePath}/audit-queries/`)
                }
              >
                <Search />
                <span>Audit Queries</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${officerBasePath}/assessments`}
                isActive={
                  pathname === `${officerBasePath}/assessments` ||
                  pathname.startsWith(`${officerBasePath}/assessments/`)
                }
              >
                <GraduationCap />
                <span>Assessments</span>
              </SidebarContractGatedItem>
              {!officerSprintsSplit ? (
                <SidebarContractGatedItem
                  unlocked={contractUnlocked}
                  href={`${officerBasePath}/sprints`}
                  isActive={isOfficerSprintsRoute}
                  badge={<SprintSidebarCountBadge count={sprintCounts.ready} />}
                >
                  <Zap />
                  <span>Sprints</span>
                </SidebarContractGatedItem>
              ) : null}
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${officerBasePath}/reporting`}
                isActive={
                  pathname === `${officerBasePath}/reporting` ||
                  pathname.startsWith(`${officerBasePath}/reporting/`)
                }
              >
                <FileBarChart />
                <span>Reporting</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {officerSprintsSplit ? (
          <SidebarGroup>
            <SidebarGroupLabel>Sprints</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contractUnlocked ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          isOfficerSprintsRoute && officerSprintTab === 'ready'
                        }
                      >
                        <SprintTabSidebarLink
                          href={buildSprintTabHref(
                            officerBasePath,
                            'ready',
                            searchParams,
                          )}
                        >
                          <Zap />
                          <span>Ready</span>
                        </SprintTabSidebarLink>
                      </SidebarMenuButton>
                      <SprintSidebarCountBadge count={sprintCounts.ready} />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          isOfficerSprintsRoute && officerSprintTab === 'drafts'
                        }
                      >
                        <SprintTabSidebarLink
                          href={buildSprintTabHref(
                            officerBasePath,
                            'drafts',
                            searchParams,
                          )}
                        >
                          <FilePen />
                          <span>Drafts</span>
                        </SprintTabSidebarLink>
                      </SidebarMenuButton>
                      <SprintSidebarCountBadge count={sprintCounts.drafts} />
                    </SidebarMenuItem>
                  </>
                ) : (
                  <>
                    <SidebarContractGatedItem
                      unlocked={false}
                      href={`${officerBasePath}/sprints`}
                      badge={
                        <SprintSidebarCountBadge count={sprintCounts.ready} />
                      }
                    >
                      <Zap />
                      <span>Ready</span>
                    </SidebarContractGatedItem>
                    <SidebarContractGatedItem
                      unlocked={false}
                      href={`${officerBasePath}/sprints`}
                      badge={
                        <SprintSidebarCountBadge count={sprintCounts.drafts} />
                      }
                    >
                      <FilePen />
                      <span>Drafts</span>
                    </SidebarContractGatedItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    )
  }

  if (isManagerSidebar && sectionLeadershipSprintTab) {
    return (
      <SectionLeadershipSidebarNav
        basePath={managerBasePath}
        pathname={pathname}
        sprintTab={sectionLeadershipSprintTab}
        sprintsReviewLabel={managerSprintsReviewLabel}
        sprintCounts={sprintCounts}
        contractUnlocked={contractUnlocked}
        sprintsNavMode={leadershipSprintsNavMode}
        hideSprintReviewTab={hideSprintReviewTab}
        showWorkstreamsNav={showWorkstreamsNav}
        useProjectMembersNav={useProjectMembersNav}
        staffNavLabel={staffNavLabel}
      />
    )
  }

  if (isSupervisorSidebar && sectionLeadershipSprintTab) {
    return (
      <SectionLeadershipSidebarNav
        basePath={supervisorBasePath}
        pathname={pathname}
        sprintTab={sectionLeadershipSprintTab}
        sprintsReviewLabel={managerSprintsReviewLabel}
        sprintCounts={sprintCounts}
        contractUnlocked={contractUnlocked}
        hideSprintReviewTab={hideSprintReviewTab}
        staffNavLabel={staffNavLabel}
      />
    )
  }

  if (isAssistantCommissionerSidebar) {
    return (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/assistant-commissioner/dashboard' ||
                    pathname.startsWith('/assistant-commissioner/dashboard/')
                  }
                >
                  <Link href='/assistant-commissioner/dashboard'>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/assistant-commissioner/contract' ||
                    pathname.startsWith('/assistant-commissioner/contract/')
                  }
                >
                  <Link href='/assistant-commissioner/contract'>
                    <FileText />
                    <span>Contract</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/assistant-commissioner/board-actions'
                isActive={
                  pathname === '/assistant-commissioner/board-actions' ||
                  pathname.startsWith(
                    '/assistant-commissioner/board-actions/',
                  )
                }
              >
                <ClipboardList />
                <span>Board Actions</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/assistant-commissioner/audit-queries'
                isActive={
                  pathname === '/assistant-commissioner/audit-queries' ||
                  pathname.startsWith(
                    '/assistant-commissioner/audit-queries/',
                  )
                }
              >
                <Search />
                <span>Audit Queries</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/assistant-commissioner/stakeholder-engagements'
                isActive={
                  pathname ===
                    '/assistant-commissioner/stakeholder-engagements' ||
                  pathname.startsWith(
                    '/assistant-commissioner/stakeholder-engagements/',
                  )
                }
              >
                <Handshake />
                <span>Stakeholder engagements</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {assistantCommissionerSections.length === 0 ? (
                <SidebarMenuItem>
                  <span className='block px-2 py-1.5 text-xs text-muted-foreground'>
                    No sections
                  </span>
                </SidebarMenuItem>
              ) : (
                assistantCommissionerSections.map(section => {
                  const href = `/sections/${section.slug?.current ?? section._id}`
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <SidebarContractGatedItem
                      key={section._id}
                      unlocked={contractUnlocked}
                      href={href}
                      isActive={active}
                    >
                      <Building2 />
                      <span className='truncate'>{section.name}</span>
                    </SidebarContractGatedItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/assistant-commissioner/reports'
                isActive={
                  pathname === '/assistant-commissioner/reports' ||
                  pathname.startsWith('/assistant-commissioner/reports/')
                }
              >
                <BarChart3 />
                <span>Reports</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    )
  }

  if (isCommissionerSidebar) {
    return (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/commissioner/dashboard' ||
                    pathname.startsWith('/commissioner/dashboard/')
                  }
                >
                  <Link href='/commissioner/dashboard'>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/commissioner/contract' ||
                    pathname.startsWith('/commissioner/contract/')
                  }
                >
                  <Link href='/commissioner/contract'>
                    <FileText />
                    <span>Contract</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/commissioner/board-actions'
                isActive={
                  pathname === '/commissioner/board-actions' ||
                  pathname.startsWith('/commissioner/board-actions/')
                }
              >
                <ClipboardList />
                <span>Board Actions</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/commissioner/audit-queries'
                isActive={
                  pathname === '/commissioner/audit-queries' ||
                  pathname.startsWith('/commissioner/audit-queries/')
                }
              >
                <Search />
                <span>Audit Queries</span>
              </SidebarContractGatedItem>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/commissioner/stakeholder-engagements'
                isActive={
                  pathname === '/commissioner/stakeholder-engagements' ||
                  pathname.startsWith(
                    '/commissioner/stakeholder-engagements/',
                  )
                }
              >
                <Handshake />
                <span>Stakeholder engagements</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Divisions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commissionerDivisions.length === 0 ? (
                <SidebarMenuItem>
                  <span className='block px-2 py-1.5 text-xs text-muted-foreground'>
                    No divisions
                  </span>
                </SidebarMenuItem>
              ) : (
                commissionerDivisions.map(div => {
                  const href = `/divisions/${div.slug?.current ?? div._id}`
                  const label = div.fullName || div.name
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <SidebarContractGatedItem
                      key={div._id}
                      unlocked={contractUnlocked}
                      href={href}
                      isActive={active}
                    >
                      <Building2 />
                      <span className='truncate'>{label}</span>
                    </SidebarContractGatedItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href='/commissioner/reports'
                isActive={
                  pathname === '/commissioner/reports' ||
                  pathname.startsWith('/commissioner/reports/')
                }
              >
                <BarChart3 />
                <span>Reports</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    )
  }

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Departments</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {departmentsTree.length === 0 ? (
              <SidebarMenuItem>
                <span className='block px-2 py-1.5 text-xs text-muted-foreground'>
                  No departments yet
                </span>
              </SidebarMenuItem>
            ) : (
              departmentsTree.map(dept => {
                const deptLabel = dept.fullName || dept.name
                const deptHref = `/departments/${dept.slug?.current ?? dept._id}`
                const deptPathMatch = pathname.match(/^\/departments\/([^/]+)/)
                const deptSlugFromPath = deptPathMatch?.[1]
                  ? decodeURIComponent(deptPathMatch[1])
                  : null
                const departmentLinkActive =
                  deptSlugFromPath != null &&
                  (dept.slug?.current === deptSlugFromPath ||
                    dept._id === deptSlugFromPath)

                return (
                  <Collapsible
                    key={dept._id}
                    open={openDeptIds.has(dept._id)}
                    onOpenChange={open => {
                      setOpenDeptIds(prev => {
                        const next = new Set(prev)
                        if (open) next.add(dept._id)
                        else next.delete(dept._id)
                        return next
                      })
                    }}
                    asChild
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={departmentLinkActive}
                        tooltip={deptLabel}
                      >
                        <Link href={deptHref}>
                          <Building />
                          <span className='truncate'>{deptLabel}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction
                          className={cn(
                            'transition-transform data-[state=open]:rotate-90',
                          )}
                          aria-label={
                            openDeptIds.has(dept._id)
                              ? 'Collapse divisions'
                              : 'Expand divisions'
                          }
                        >
                          <ChevronRight />
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dept.divisions.length === 0 ? (
                            <SidebarMenuSubItem>
                              <span className='block px-2 py-1 text-xs text-muted-foreground'>
                                No divisions
                              </span>
                            </SidebarMenuSubItem>
                          ) : (
                            dept.divisions.map(div => {
                              const href = `/divisions/${div.slug?.current ?? div._id}`
                              const label = div.fullName || div.name
                              const onDivisionRoute =
                                pathname === href ||
                                pathname.startsWith(`${href}/`)
                              const onSectionInThisDivision =
                                sectionDivisionId != null &&
                                sectionDivisionId === div._id
                              const active =
                                onDivisionRoute || onSectionInThisDivision
                              return (
                                <SidebarMenuSubItem key={div._id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={active}
                                    size='sm'
                                  >
                                    <Link href={href}>
                                      <span className='truncate'>{label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
