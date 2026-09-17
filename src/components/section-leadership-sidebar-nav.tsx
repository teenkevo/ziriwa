'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  FileBarChart,
  FilePen,
  FileText,
  Handshake,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Search,
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
import { SidebarContractGatedItem } from '@/components/sidebar-contract-gated-item'
import { SprintTabSidebarLink } from '@/components/sprint-tab-sidebar-link'
import { buildSprintTabHref } from '@/lib/sprint-tab-href'
import type { SprintNavCounts } from '@/lib/sprint-nav-counts'

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
  /** When false, only Dashboard and Contract stay enabled. */
  contractUnlocked?: boolean
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
  contractUnlocked = true,
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
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={`${basePath}/stakeholders`}
              isActive={
                pathname === `${basePath}/stakeholders` ||
                pathname.startsWith(`${basePath}/stakeholders/`)
              }
            >
              <Handshake />
              <span>Stakeholders</span>
            </SidebarContractGatedItem>
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={`${basePath}/board-actions`}
              isActive={
                pathname === `${basePath}/board-actions` ||
                pathname.startsWith(`${basePath}/board-actions/`)
              }
            >
              <ClipboardList />
              <span>Board Actions</span>
            </SidebarContractGatedItem>
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={`${basePath}/audit-queries`}
              isActive={
                pathname === `${basePath}/audit-queries` ||
                pathname.startsWith(`${basePath}/audit-queries/`)
              }
            >
              <Search />
              <span>Audit Queries</span>
            </SidebarContractGatedItem>
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={`${basePath}/assessments`}
              isActive={
                pathname === `${basePath}/assessments` ||
                pathname.startsWith(`${basePath}/assessments/`)
              }
            >
              <GraduationCap />
              <span>Assessments</span>
            </SidebarContractGatedItem>
            {showWorkstreamsNav ? (
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${basePath}/workstreams`}
                isActive={
                  pathname === `${basePath}/workstreams` ||
                  pathname.startsWith(`${basePath}/workstreams/`)
                }
              >
                <Layers />
                <span>Workstreams</span>
              </SidebarContractGatedItem>
            ) : null}
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={useProjectMembersNav ? membersHref : staffHref}
              isActive={
                useProjectMembersNav
                  ? membersNavActive
                  : pathname === staffHref ||
                    pathname.startsWith(`${staffHref}/`)
              }
            >
              <Users />
              <span>
                {useProjectMembersNav
                  ? 'Project members'
                  : (staffNavLabel ?? 'Staff')}
              </span>
            </SidebarContractGatedItem>
            <SidebarContractGatedItem
              unlocked={contractUnlocked}
              href={`${basePath}/reporting`}
              isActive={
                pathname === `${basePath}/reporting` ||
                pathname.startsWith(`${basePath}/reporting/`)
              }
            >
              <FileBarChart />
              <span>Reporting</span>
            </SidebarContractGatedItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        {sprintsNavMode === 'ready-only' ? (
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarContractGatedItem
                unlocked={contractUnlocked}
                href={`${basePath}/sprints`}
                isActive={isSprintsRoute}
                badge={
                  <SprintSidebarCountBadge count={sprintCounts.ready} />
                }
              >
                <Zap />
                <span>Sprints</span>
              </SidebarContractGatedItem>
            </SidebarMenu>
          </SidebarGroupContent>
        ) : (
          <>
            <SidebarGroupLabel>Sprints</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contractUnlocked ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isSprintsRoute && sprintTab === 'ready'}
                      >
                        <SprintTabSidebarLink
                          href={buildSprintTabHref(
                            basePath,
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
                        <SprintSidebarCountBadge
                          count={sprintCounts.inReview}
                        />
                      </SidebarMenuItem>
                    ) : null}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isSprintsRoute && sprintTab === 'drafts'}
                      >
                        <SprintTabSidebarLink
                          href={buildSprintTabHref(
                            basePath,
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
                      href={`${basePath}/sprints`}
                      badge={
                        <SprintSidebarCountBadge count={sprintCounts.ready} />
                      }
                    >
                      <Zap />
                      <span>Ready</span>
                    </SidebarContractGatedItem>
                    {!hideSprintReviewTab ? (
                      <SidebarContractGatedItem
                        unlocked={false}
                        href={`${basePath}/sprints`}
                        badge={
                          <SprintSidebarCountBadge
                            count={sprintCounts.inReview}
                          />
                        }
                      >
                        <ShieldCheck />
                        <span>{sprintsReviewLabel}</span>
                      </SidebarContractGatedItem>
                    ) : null}
                    <SidebarContractGatedItem
                      unlocked={false}
                      href={`${basePath}/sprints`}
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
          </>
        )}
      </SidebarGroup>
    </SidebarContent>
  )
}
