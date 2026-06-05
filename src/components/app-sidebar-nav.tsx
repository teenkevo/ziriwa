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
  Handshake,
  Landmark,
  LayoutDashboard,
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === `${officerBasePath}/stakeholders` ||
                    pathname.startsWith(`${officerBasePath}/stakeholders/`)
                  }
                >
                  <Link href={`${officerBasePath}/stakeholders`}>
                    <Handshake />
                    <span>Stakeholders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!officerSprintsSplit ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isOfficerSprintsRoute}
                  >
                    <Link href={`${officerBasePath}/sprints`}>
                      <Zap />
                      <span>Sprints</span>
                    </Link>
                  </SidebarMenuButton>
                  <SprintSidebarCountBadge count={sprintCounts.ready} />
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === `${officerBasePath}/reporting` ||
                    pathname.startsWith(`${officerBasePath}/reporting/`)
                  }
                >
                  <Link href={`${officerBasePath}/reporting`}>
                    <FileBarChart />
                    <span>Reporting</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {officerSprintsSplit ? (
          <SidebarGroup>
            <SidebarGroupLabel>Sprints</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      isOfficerSprintsRoute && officerSprintTab === 'ready'
                    }
                  >
                    <Link href={`${officerBasePath}/sprints?tab=ready`}>
                      <Zap />
                      <span>Ready</span>
                    </Link>
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
                    <Link href={`${officerBasePath}/sprints?tab=drafts`}>
                      <FilePen />
                      <span>Drafts</span>
                    </Link>
                  </SidebarMenuButton>
                  <SprintSidebarCountBadge count={sprintCounts.drafts} />
                </SidebarMenuItem>
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
                    pathname === '/assistant-commissioner/board-actions' ||
                    pathname.startsWith(
                      '/assistant-commissioner/board-actions/',
                    )
                  }
                >
                  <Link href='/assistant-commissioner/board-actions'>
                    <ClipboardList />
                    <span>Board Actions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname ===
                      '/assistant-commissioner/stakeholder-engagements' ||
                    pathname.startsWith(
                      '/assistant-commissioner/stakeholder-engagements/',
                    )
                  }
                >
                  <Link href='/assistant-commissioner/stakeholder-engagements'>
                    <Handshake />
                    <span>Stakeholder engagements</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                    <SidebarMenuItem key={section._id}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={href}>
                          <Building2 />
                          <span className='truncate'>{section.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/assistant-commissioner/reports' ||
                    pathname.startsWith('/assistant-commissioner/reports/')
                  }
                >
                  <Link href='/assistant-commissioner/reports'>
                    <BarChart3 />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                    pathname === '/commissioner/board-actions' ||
                    pathname.startsWith('/commissioner/board-actions/')
                  }
                >
                  <Link href='/commissioner/board-actions'>
                    <ClipboardList />
                    <span>Board Actions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/commissioner/stakeholder-engagements' ||
                    pathname.startsWith(
                      '/commissioner/stakeholder-engagements/',
                    )
                  }
                >
                  <Link href='/commissioner/stakeholder-engagements'>
                    <Handshake />
                    <span>Stakeholder engagements</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                    <SidebarMenuItem key={div._id}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={href}>
                          <Building2 />
                          <span className='truncate'>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/commissioner/reports' ||
                    pathname.startsWith('/commissioner/reports/')
                  }
                >
                  <Link href='/commissioner/reports'>
                    <BarChart3 />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
