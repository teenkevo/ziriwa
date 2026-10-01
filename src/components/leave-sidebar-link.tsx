'use client'

import { CalendarDays } from 'lucide-react'

import { SidebarContractGatedItem } from '@/components/sidebar-contract-gated-item'

export function LeaveSidebarLink({
  pathname,
  unlocked = true,
}: {
  pathname: string
  /** When false, the item stays locked until a performance contract exists. */
  unlocked?: boolean
}) {
  const isActive = pathname === '/leave' || pathname.startsWith('/leave/')

  return (
    <SidebarContractGatedItem
      unlocked={unlocked}
      href='/leave'
      isActive={isActive}
      openTooltip='Leave Management'
    >
      <CalendarDays />
      <span>Leave Management</span>
    </SidebarContractGatedItem>
  )
}
