'use client'

import * as React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const LOCKED_TOOLTIP = 'Onboard a contract first'

interface SidebarContractGatedItemProps {
  unlocked: boolean
  href: string
  isActive?: boolean
  children: React.ReactNode
  /** Optional badge / trailing content inside the menu item (shown when unlocked). */
  badge?: React.ReactNode
  tooltip?: string
}

/**
 * Dashboard / Contract stay clickable; other items are disabled until a FY contract exists.
 */
export function SidebarContractGatedItem({
  unlocked,
  href,
  isActive,
  children,
  badge,
  tooltip = LOCKED_TOOLTIP,
}: SidebarContractGatedItemProps) {
  if (unlocked) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={href}>{children}</Link>
        </SidebarMenuButton>
        {badge}
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        disabled
        aria-disabled='true'
        isActive={isActive}
        tooltip={tooltip}
      >
        {children}
      </SidebarMenuButton>
      <SidebarMenuBadge
        aria-hidden='true'
        className='text-muted-foreground'
        title={tooltip}
      >
        <Lock className='size-3.5' />
      </SidebarMenuBadge>
    </SidebarMenuItem>
  )
}
