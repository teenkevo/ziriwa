'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Users } from 'lucide-react'

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar } from '../ui/avatar'

export function AdminSidebarNavLink() {
  const pathname = usePathname()
  const isActive =
    pathname === '/admin/users' || pathname.startsWith('/admin/users/')

  return (
    <SidebarFooter className='border-t border-sidebar-border'>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip='User management'
          >
            <Link href='/admin/users'>
              <User />
              <span>User management</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
