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
import { GlobalSearch } from '@/components/global-search'
import { UserNav } from '@/features/dashboard/components/user-nav'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppBreadcrumb } from '@/contexts/app-breadcrumb-context'

export function AppTopBar() {
  const { items } = useAppBreadcrumb()

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-4'>
      <SidebarTrigger className='-ml-1 shrink-0' />
      <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
        {items.length > 0 && (
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
        )}
        <SignedIn>
          <GlobalSearch
            className={cn(
              'min-w-0 w-full flex-1 sm:w-[min(22rem,40vw)] sm:flex-none sm:shrink-0',
              items.length === 0 && 'sm:ml-auto',
            )}
          />
        </SignedIn>
        {items.length === 0 && (
          <SignedOut>
            <div className='min-w-0 flex-1' />
          </SignedOut>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
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
