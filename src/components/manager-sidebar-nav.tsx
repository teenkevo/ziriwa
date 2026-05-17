'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileBarChart,
  FileText,
  Handshake,
  LayoutDashboard,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import type { AppRole } from '@/lib/app-role'

type ManagerSidebarNavProps = {
  role: AppRole | null
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ManagerSidebarNav({ role }: ManagerSidebarNavProps) {
  const pathname = usePathname()
  const reviewLabel = role === 'supervisor' ? 'In Review' : 'To Review'

  const mainItems = [
    { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/manager/contract', label: 'Contract', icon: FileText },
  ]

  const bottomItems = [
    { href: '/manager/stakeholders', label: 'Stakeholders', icon: Handshake },
    { href: '/manager/staff', label: 'Staff', icon: Users },
    { href: '/manager/reporting', label: 'Reporting', icon: FileBarChart },
  ]

  const sprintsOpen = pathname.startsWith('/manager/sprints')

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainItems.map(item => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            <Collapsible defaultOpen={sprintsOpen} asChild>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={sprintsOpen}
                    tooltip='Sprints'
                  >
                    <Zap />
                    <span>Sprints</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === '/manager/sprints/ready'}
                      >
                        <Link href='/manager/sprints/ready'>Ready</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === '/manager/sprints/to-review'}
                      >
                        <Link href='/manager/sprints/to-review'>{reviewLabel}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === '/manager/sprints/drafts'}
                      >
                        <Link href='/manager/sprints/drafts'>Drafts</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {bottomItems.map(item => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
