'use client'

import * as React from 'react'
import Link from 'next/link'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ModeToggle } from '@/components/modeToggle'
import { AppNotificationBell } from '@/components/app-notification-bell'
import { TransferApprovalInbox } from '@/components/transfer-approval-inbox'
import { GlobalSearch } from '@/components/global-search'
import { UserNav } from '@/features/dashboard/components/user-nav'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppBreadcrumb } from '@/contexts/app-breadcrumb-context'

type RoleNavbarIdentity = {
  roleLabel: string
  contextLabel?: string
  separator: '|' | '-'
}

export function AppTopBar({
  roleIdentity,
}: {
  roleIdentity?: RoleNavbarIdentity | null
}) {
  const { items, headerIdentity } = useAppBreadcrumb()
  const visibleIdentity = headerIdentity
    ? {
        roleLabel: headerIdentity.roleLabel,
        contextLabel: headerIdentity.sectionLabel,
        separator: headerIdentity.separator ?? ('|' as const),
      }
    : roleIdentity
  // Led department / division / section is already in the header; skip page trail.
  const showBreadcrumbs =
    items.length > 0 && !visibleIdentity?.contextLabel
  const hasHeaderContent = Boolean(visibleIdentity) || showBreadcrumbs

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-4'>
      <SidebarTrigger className='-ml-1 shrink-0' />
      <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
        {visibleIdentity || showBreadcrumbs ? (
          <div className='hidden min-w-0 flex-1 items-center gap-2 text-sm lg:flex'>
            {visibleIdentity ? (
              <>
                <span className='shrink-0 font-medium text-primary'>
                  {visibleIdentity.roleLabel}
                </span>
                {visibleIdentity.contextLabel ? (
                  <>
                    <span className='text-muted-foreground'>
                      {visibleIdentity.separator}
                    </span>
                    <span className='shrink-0 font-medium text-foreground'>
                      {visibleIdentity.contextLabel}
                    </span>
                  </>
                ) : null}
              </>
            ) : null}
            {showBreadcrumbs ? (
              <>
                {visibleIdentity && !visibleIdentity.contextLabel ? (
                  <span className='text-muted-foreground'>/</span>
                ) : null}
                <Breadcrumb className='min-w-0 text-muted-foreground'>
                  <BreadcrumbList className='flex-wrap'>
                    {items.map((item, i) => (
                      <React.Fragment key={`${item.label}-${i}`}>
                        {i > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem className='min-w-0'>
                          {item.href ? (
                            <BreadcrumbLink asChild>
                              <Link href={item.href} title={item.label}>
                                {item.label}
                              </Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage title={item.label}>
                              {item.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            ) : null}
          </div>
        ) : null}
        <SignedIn>
          <GlobalSearch
            className={cn(
              'min-w-0 w-full flex-1 sm:w-[min(22rem,40vw)] sm:flex-none sm:shrink-0',
              !hasHeaderContent && 'sm:ml-auto',
            )}
          />
        </SignedIn>
        {!hasHeaderContent && (
          <SignedOut>
            <div className='min-w-0 flex-1' />
          </SignedOut>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <SignedIn>
          <Button variant='ghost' size='sm' className='hidden sm:inline-flex' asChild>
            <Link href='/workspace'>Switch workspace</Link>
          </Button>
          <TransferApprovalInbox />
          <AppNotificationBell />
        </SignedIn>
        <ModeToggle />
        <SignedIn>
          <UserNav />
        </SignedIn>
        <SignedOut>
          <SignInButton mode='modal'>
            <Button variant='outline' size='sm'>
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  )
}
