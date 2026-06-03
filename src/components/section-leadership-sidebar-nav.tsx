'use client'

import Link from 'next/link'
import {
  FileBarChart,
  FilePen,
  FileText,
  Handshake,
  LayoutDashboard,
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
  basePath: Extract<WorkspaceBasePath, '/manager' | '/supervisor'>
  pathname: string
  sprintTab: 'ready' | 'to-review' | 'drafts'
  sprintsReviewLabel: string
  sprintCounts: SprintNavCounts
}

export function SectionLeadershipSidebarNav({
  basePath,
  pathname,
  sprintTab,
  sprintsReviewLabel,
  sprintCounts,
}: SectionLeadershipSidebarNavProps) {
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === `${basePath}/staff` ||
                  pathname.startsWith(`${basePath}/staff/`)
                }
              >
                <Link href={`${basePath}/staff`}>
                  <Users />
                  <span>Staff</span>
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
        <SidebarGroupLabel>Sprints</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isSprintsRoute && sprintTab === 'ready'}
              >
                <Link href={`${basePath}/sprints?tab=ready`}>
                  <Zap />
                  <span>Ready</span>
                </Link>
              </SidebarMenuButton>
              <SprintSidebarCountBadge count={sprintCounts.ready} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isSprintsRoute && sprintTab === 'to-review'}
              >
                <Link href={`${basePath}/sprints?tab=to-review`}>
                  <ShieldCheck />
                  <span>{sprintsReviewLabel}</span>
                </Link>
              </SidebarMenuButton>
              <SprintSidebarCountBadge count={sprintCounts.inReview} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isSprintsRoute && sprintTab === 'drafts'}
              >
                <Link href={`${basePath}/sprints?tab=drafts`}>
                  <FilePen />
                  <span>Drafts</span>
                </Link>
              </SidebarMenuButton>
              <SprintSidebarCountBadge count={sprintCounts.drafts} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
