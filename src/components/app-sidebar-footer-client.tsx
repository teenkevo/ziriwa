'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarClock, FolderKanban, ScrollText, User } from 'lucide-react'

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useDelegationSidebarOptional } from '@/contexts/delegation-sidebar-context'
import { useWorkContextNavigationOptional } from '@/contexts/work-context-navigation-context'

const ADMIN_LINKS = [
  { href: '/admin/users', label: 'User management', icon: User },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
] as const

interface AppSidebarFooterClientProps {
  showAdmin: boolean
}

export function AppSidebarFooterClient({
  showAdmin,
}: AppSidebarFooterClientProps) {
  const pathname = usePathname()
  const delegation = useDelegationSidebarOptional()
  const navigation = useWorkContextNavigationOptional()
  const isSwitching = navigation?.isSwitching ?? false
  const showDelegateButton = delegation?.canSelfServiceDelegate ?? false

  if (!showDelegateButton && !showAdmin) return null

  return (
    <SidebarFooter className='border-t border-sidebar-border'>
      {showDelegateButton ? (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type='button'
              disabled={isSwitching}
              onClick={delegation?.onOpenDelegate}
              tooltip='Delegate while on leave'
            >
              <CalendarClock />
              <span>Delegate while on leave</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      ) : null}
      {showAdmin ? (
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
      ) : null}
    </SidebarFooter>
  )
}
