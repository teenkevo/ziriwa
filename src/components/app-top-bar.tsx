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

export function AppTopBar() {
  const { items, headerIdentity } = useAppBreadcrumb()
  const hasHeaderContent = Boolean(headerIdentity) || items.length > 0

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-4'>
      <SidebarTrigger className='-ml-1 shrink-0' />
      <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
        {headerIdentity ? (
          <div className='hidden min-w-0 flex-1 items-center text-sm font-medium lg:flex'>
            <span className='truncate text-primary'>
              {headerIdentity.roleLabel}
            </span>
            <span className='mx-2 text-muted-foreground'>|</span>
            <span className='truncate text-foreground'>
              {headerIdentity.sectionLabel}
            </span>
          </div>
        ) : items.length > 0 ? (
          <Breadcrumb className='hidden min-w-0 flex-1 text-muted-foreground lg:flex lg:items-center'>
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
