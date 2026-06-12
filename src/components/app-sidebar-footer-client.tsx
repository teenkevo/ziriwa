'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarClock,
  FolderKanban,
  Loader2,
  MailWarning,
  ScrollText,
  User,
  UserRoundSearch,
} from 'lucide-react'
import { toast } from 'sonner'

import { ImpersonationDialog } from '@/components/impersonation-dialog'
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
  showImpersonate?: boolean
  showSprintEmailTest?: boolean
}

export function AppSidebarFooterClient({
  showAdmin,
  showImpersonate = false,
  showSprintEmailTest = false,
}: AppSidebarFooterClientProps) {
  const pathname = usePathname()
  const delegation = useDelegationSidebarOptional()
  const navigation = useWorkContextNavigationOptional()
  const isSwitching = navigation?.isSwitching ?? false
  const showDelegateButton = delegation?.canSelfServiceDelegate ?? false
  const [impersonateOpen, setImpersonateOpen] = React.useState(false)
  const [isSendingSprintEmailTest, setIsSendingSprintEmailTest] =
    React.useState(false)

  async function handleSprintEmailTest() {
    setIsSendingSprintEmailTest(true)
    try {
      const res = await fetch('/api/email/sprint-missing-submissions-test', {
        method: 'POST',
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        sent?: boolean
        emailsSent?: number
      }

      if (!res.ok) {
        throw new Error(data.error || 'Could not send test email')
      }

      if (data.sent) {
        toast.success(data.message || 'Sprint reminder email sent')
      } else {
        toast.message(data.message || 'No sprint reminder email was sent')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not send test email',
      )
    } finally {
      setIsSendingSprintEmailTest(false)
    }
  }

  if (
    !showSprintEmailTest &&
    !showDelegateButton &&
    !showAdmin &&
    !showImpersonate
  ) {
    return null
  }

  return (
    <>
      <SidebarFooter className='border-t border-sidebar-border'>
        {showSprintEmailTest ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                type='button'
                disabled={isSwitching || isSendingSprintEmailTest}
                onClick={() => void handleSprintEmailTest()}
                tooltip='Send sprint status emails (all tasks) to you, supervisors, and officers'
              >
                {isSendingSprintEmailTest ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <MailWarning />
                )}
                <span>Test sprint reminder emails</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
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
        {showImpersonate ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                type='button'
                onClick={() => setImpersonateOpen(true)}
                tooltip='Impersonate user'
              >
                <UserRoundSearch />
                <span>Impersonate</span>
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

      {showImpersonate ? (
        <ImpersonationDialog
          open={impersonateOpen}
          onOpenChange={setImpersonateOpen}
        />
      ) : null}
    </>
  )
}
