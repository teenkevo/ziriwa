'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      <Link
        href='/dashboard'
        className={`text-sm font-medium transition-colors ${
          pathname === '/dashboard' ? 'text-primary' : 'hover:text-primary'
        }`}
      >
        Dashboard
      </Link>
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
      <Link
        href='/investments'
        className={`text-sm font-medium transition-colors ${
          pathname === '/investments'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        Investments
      </Link>
    </>
  )
}
