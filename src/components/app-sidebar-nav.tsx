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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
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

export function AppSidebarNav({
  departmentsTree,
  variant = 'default',
  commissionerDivisions = [],
  assistantCommissionerSections = [],
  managerSprintsReviewLabel = 'To Review',
}: {
  departmentsTree: SidebarDepartmentWithDivisions[]
  variant?:
    | 'default'
    | 'commissioner'
    | 'assistant-commissioner'
    | 'manager'
    | 'officer'
  commissionerDivisions?: SidebarDivision[]
  assistantCommissionerSections?: SidebarSection[]
  managerSprintsReviewLabel?: string
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
  const isOfficerSidebar = variant === 'officer'
  const managerSprintTab = isManagerSidebar
    ? resolveManagerSprintTab(searchParams.get('tab'))
    : null
  const isManagerSprintsRoute =
    pathname === '/manager/sprints' || pathname.startsWith('/manager/sprints/')

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
                    pathname === '/officer/dashboard' ||
                    pathname.startsWith('/officer/dashboard/')
                  }
                >
                  <Link href='/officer/dashboard'>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/officer/contract' ||
                    pathname.startsWith('/officer/contract/')
                  }
                >
                  <Link href='/officer/contract'>
                    <FileText />
                    <span>Contract</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/officer/stakeholders' ||
                    pathname.startsWith('/officer/stakeholders/')
                  }
                >
                  <Link href='/officer/stakeholders'>
                    <Handshake />
                    <span>Stakeholders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/officer/sprints' ||
                    pathname.startsWith('/officer/sprints/')
                  }
                >
                  <Link href='/officer/sprints'>
                    <Zap />
                    <span>Sprints</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/officer/reporting' ||
                    pathname.startsWith('/officer/reporting/')
                  }
                >
                  <Link href='/officer/reporting'>
                    <FileBarChart />
                    <span>Reporting</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    )
  }

  if (isManagerSidebar) {
    return (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/manager/dashboard' ||
                    pathname.startsWith('/manager/dashboard/')
                  }
                >
                  <Link href='/manager/dashboard'>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/manager/contract' ||
                    pathname.startsWith('/manager/contract/')
                  }
                >
                  <Link href='/manager/contract'>
                    <FileText />
                    <span>Contract</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/manager/stakeholders' ||
                    pathname.startsWith('/manager/stakeholders/')
                  }
                >
                  <Link href='/manager/stakeholders'>
                    <Handshake />
                    <span>Stakeholders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/manager/staff' ||
                    pathname.startsWith('/manager/staff/')
                  }
                >
                  <Link href='/manager/staff'>
                    <Users />
                    <span>Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/manager/reporting' ||
                    pathname.startsWith('/manager/reporting/')
                  }
                >
                  <Link href='/manager/reporting'>
                    <FileBarChart />
                    <span>Reporting</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sprints</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    isManagerSprintsRoute && managerSprintTab === 'ready'
                  }
                >
                  <Link href='/manager/sprints?tab=ready'>
                    <Zap />
                    <span>Ready</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    isManagerSprintsRoute && managerSprintTab === 'to-review'
                  }
                >
                  <Link href='/manager/sprints?tab=to-review'>
                    <ShieldCheck />
                    <span>{managerSprintsReviewLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    isManagerSprintsRoute && managerSprintTab === 'drafts'
                  }
                >
                  <Link href='/manager/sprints?tab=drafts'>
                    <FilePen />
                    <span>Drafts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
