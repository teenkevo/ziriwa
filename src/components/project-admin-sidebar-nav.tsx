'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, Settings2, Users } from 'lucide-react'

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface ProjectAdminSidebarNavProps {
  adminBasePath: string
}

export function ProjectAdminSidebarNav({
  adminBasePath,
}: ProjectAdminSidebarNavProps) {
  const pathname = usePathname()
  const membersHref = `${adminBasePath}/members`
  const isSetupActive =
    pathname === adminBasePath &&
    !pathname.startsWith(`${adminBasePath}/members`) &&
    !pathname.startsWith(`${adminBasePath}/staff`)
  const isMembersActive =
    pathname === membersHref ||
    pathname.startsWith(`${membersHref}/`) ||
    pathname === `${adminBasePath}/staff` ||
    pathname.startsWith(`${adminBasePath}/staff/`)

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Project</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isSetupActive}>
                <Link href={adminBasePath}>
                  <Settings2 />
                  <span>Workstreams</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isMembersActive}>
                <Link href={membersHref}>
                  <Users />
                  <span>Project members</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/workspace/projects'}
              >
                <Link href='/workspace/projects'>
                  <FolderKanban />
                  <span>All projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
