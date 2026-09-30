'use client'

import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function LeaveSidebarLink({ pathname }: { pathname: string }) {
  const isActive = pathname === '/leave' || pathname.startsWith('/leave/')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip='Leave Management'>
        <Link href='/leave'>
          <CalendarDays />
          <span>Leave Management</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
