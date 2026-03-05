'use client'
import React from 'react'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TeamSwitcher from '@/features/dashboard/components/team-switcher'

export default function MobileNav() {
  const pathname = usePathname()
  return (
    <div className='md:hidden'>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant='ghost' size='icon'>
            <HamburgerMenuIcon className='h-6 w-6' />
          </Button>
        </SheetTrigger>
        <SheetContent side='top'>
          <div className='flex flex-col p-4 space-y-4'>
            <SheetClose asChild>
              <Link
                href='/dashboard'
                className={`text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-primary'
                    : 'hover:text-primary'
                }`}
              >
                Dashboard
              </Link>
            </SheetClose>

            <SheetClose asChild>
              <Link
                href='/members'
                className={`text-sm font-medium transition-colors ${
                  pathname === '/members'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Members
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href='/resolutions'
                className={`text-sm font-medium transition-colors ${
                  pathname === '/resolutions'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Resolutions
              </Link>
            </SheetClose>
          </div>
          <TeamSwitcher />
        </SheetContent>
      </Sheet>
    </div>
  )
}
