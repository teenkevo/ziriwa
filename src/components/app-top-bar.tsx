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
import { UserNav } from '@/features/dashboard/components/user-nav'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { useAppBreadcrumb } from '@/contexts/app-breadcrumb-context'

export function AppTopBar() {
  const { items } = useAppBreadcrumb()

  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b px-4'>
      <SidebarTrigger className='-ml-1 shrink-0' />
      {items.length > 0 && (
        <Breadcrumb className='min-w-0 flex-1 text-muted-foreground'>
          <BreadcrumbList className='flex-nowrap overflow-hidden'>
            {items.map((item, i) => (
              <React.Fragment key={`${item.label}-${i}`}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className='min-w-0 max-w-[min(40vw,12rem)] sm:max-w-[16rem]'>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={item.href} className='truncate'>
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className='truncate' title={item.label}>
                      {item.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {items.length === 0 && <div className='min-w-0 flex-1' />}
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
