'use client'

import * as React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const LOCKED_TOOLTIP = 'Finalize your performance contract first'

interface SidebarContractGatedItemProps {
  unlocked: boolean
  href: string
  isActive?: boolean
  children: React.ReactNode
  /** Optional badge / trailing content inside the menu item (shown when unlocked). */
  badge?: React.ReactNode
  tooltip?: string
  /** Tooltip when the item is clickable (collapsed sidebar). */
  openTooltip?: string
}

/**
 * Dashboard / Contract stay clickable; other items are disabled until the FY contract is finalized.
 */
export function SidebarContractGatedItem({
  unlocked,
  href,
  isActive,
  children,
  badge,
  tooltip = LOCKED_TOOLTIP,
  openTooltip,
}: SidebarContractGatedItemProps) {
  if (unlocked) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={openTooltip}>
          <Link href={href} prefetch={false}>
            {children}
          </Link>
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
