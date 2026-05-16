'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScrollText, User } from 'lucide-react'

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const ADMIN_LINKS = [
  { href: '/admin/users', label: 'User management', icon: User },
  { href: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
] as const

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <SidebarFooter className='border-t border-sidebar-border'>
      <SidebarMenu>
        {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === href || pathname.startsWith(`${href}/`)}
              tooltip={label}
            >
              <Link href={href}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarFooter>
  )
}
