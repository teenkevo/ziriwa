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
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

function isActive(pathname: string, href: string) {
  const hrefPath = href.split('?')[0] ?? href
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)
}

export function ManagerSidebarNav() {
  const pathname = usePathname()

  const mainItems = [
    { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/manager/contract', label: 'Contract', icon: FileText },
    { href: '/manager/sprints?tab=ready', label: 'Sprints', icon: Zap },
  ]

  const bottomItems = [
    { href: '/manager/stakeholders', label: 'Stakeholders', icon: Handshake },
    { href: '/manager/staff', label: 'Staff', icon: Users },
    { href: '/manager/reporting', label: 'Reporting', icon: FileBarChart },
  ]

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
                      <Icon
                        className={`${isActive(pathname, item.href) ? 'text-primary' : ''}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

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
                      <Icon
                        className={`${isActive(pathname, item.href) ? 'text-primary' : ''}`}
                      />
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
