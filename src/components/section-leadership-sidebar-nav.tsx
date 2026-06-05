'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  FileBarChart,
  FilePen,
  FileText,
  Handshake,
  LayoutDashboard,
  Layers,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { SprintTabSidebarLink } from '@/components/sprint-tab-sidebar-link'
import { buildSprintTabHref } from '@/lib/sprint-tab-href'
import type { SprintNavCounts } from '@/lib/sprint-nav-counts'
import type { WorkspaceBasePath } from '@/lib/workspace-paths'

function SprintSidebarCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <SidebarMenuBadge>
      {count > 99 ? '99+' : count}
    </SidebarMenuBadge>
  )
}

interface SectionLeadershipSidebarNavProps {
  basePath: string
  pathname: string
  sprintTab: 'ready' | 'to-review' | 'drafts'
  sprintsReviewLabel: string
  sprintCounts: SprintNavCounts
  /** Project PM/DPM: single Sprints link (ready only). Workstream roles use split nav. */
  sprintsNavMode?: 'split' | 'ready-only'
  /** Project PM workspace: only Ready and Drafts (no manager review queue). */
  hideSprintReviewTab?: boolean
  /** Project manager: link to workstreams setup. */
  showWorkstreamsNav?: boolean
  /** Project PM / DPM: project members roster (not section staff). */
  useProjectMembersNav?: boolean
  /** Override default "Staff" label (e.g. workstream lead → Workstream Members). */
  staffNavLabel?: string
}

export function SectionLeadershipSidebarNav({
  basePath,
  pathname,
  sprintTab,
  sprintsReviewLabel,
  sprintCounts,
  sprintsNavMode = 'split',
  hideSprintReviewTab = false,
  showWorkstreamsNav = false,
  useProjectMembersNav = false,
  staffNavLabel,
}: SectionLeadershipSidebarNavProps) {
  const searchParams = useSearchParams()
  const membersHref = `${basePath}/members`
  const staffHref = `${basePath}/staff`
  const membersNavActive =
    pathname === membersHref ||
    pathname.startsWith(`${membersHref}/`) ||
    pathname === staffHref ||
    pathname.startsWith(`${staffHref}/`)
  const isSprintsRoute =
    pathname === `${basePath}/sprints` ||
    pathname.startsWith(`${basePath}/sprints/`)

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === `${basePath}/dashboard` ||
                  pathname.startsWith(`${basePath}/dashboard/`)
                }
              >
                <Link href={`${basePath}/dashboard`}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === `${basePath}/contract` ||
                  pathname.startsWith(`${basePath}/contract/`)
                }
              >
                <Link href={`${basePath}/contract`}>
                  <FileText />
                  <span>Contract</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === `${basePath}/stakeholders` ||
                  pathname.startsWith(`${basePath}/stakeholders/`)
                }
              >
                <Link href={`${basePath}/stakeholders`}>
                  <Handshake />
                  <span>Stakeholders</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {showWorkstreamsNav ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === `${basePath}/workstreams` ||
                    pathname.startsWith(`${basePath}/workstreams/`)
                  }
                >
                  <Link href={`${basePath}/workstreams`}>
                    <Layers />
                    <span>Workstreams</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  useProjectMembersNav
                    ? membersNavActive
                    : pathname === staffHref ||
                      pathname.startsWith(`${staffHref}/`)
                }
              >
                <Link
                  href={useProjectMembersNav ? membersHref : staffHref}
                >
                  <Users />
                  <span>
                    {useProjectMembersNav
                      ? 'Project members'
                      : (staffNavLabel ?? 'Staff')}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === `${basePath}/reporting` ||
                  pathname.startsWith(`${basePath}/reporting/`)
                }
              >
                <Link href={`${basePath}/reporting`}>
                  <FileBarChart />
                  <span>Reporting</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        {sprintsNavMode === 'ready-only' ? (
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isSprintsRoute}
                >
                  <Link href={`${basePath}/sprints`}>
                    <Zap />
                    <span>Sprints</span>
                  </Link>
                </SidebarMenuButton>
                <SprintSidebarCountBadge count={sprintCounts.ready} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        ) : (
          <>
            <SidebarGroupLabel>Sprints</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isSprintsRoute && sprintTab === 'ready'}
                  >
                    <SprintTabSidebarLink
                      href={buildSprintTabHref(basePath, 'ready', searchParams)}
                    >
                      <Zap />
                      <span>Ready</span>
                    </SprintTabSidebarLink>
                  </SidebarMenuButton>
                  <SprintSidebarCountBadge count={sprintCounts.ready} />
                </SidebarMenuItem>
                {!hideSprintReviewTab ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isSprintsRoute && sprintTab === 'to-review'}
                    >
                      <SprintTabSidebarLink
                        href={buildSprintTabHref(
                          basePath,
                          'to-review',
                          searchParams,
                        )}
                      >
                        <ShieldCheck />
                        <span>{sprintsReviewLabel}</span>
                      </SprintTabSidebarLink>
                    </SidebarMenuButton>
                    <SprintSidebarCountBadge count={sprintCounts.inReview} />
                  </SidebarMenuItem>
                ) : null}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isSprintsRoute && sprintTab === 'drafts'}
                  >
                    <SprintTabSidebarLink
                      href={buildSprintTabHref(basePath, 'drafts', searchParams)}
                    >
                      <FilePen />
                      <span>Drafts</span>
                    </SprintTabSidebarLink>
                  </SidebarMenuButton>
                  <SprintSidebarCountBadge count={sprintCounts.drafts} />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </>
        )}
      </SidebarGroup>
    </SidebarContent>
  )
}
