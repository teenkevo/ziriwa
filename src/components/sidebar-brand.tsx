'use client'

import Link from 'next/link'
import Logo from '@/components/logo'
import { useSidebar } from '@/components/ui/sidebar'

export function SidebarBrand() {
  const { state } = useSidebar()

  if (state === 'collapsed') {
    return (
      <Link
        href='/departments'
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/40 text-xs font-bold text-primary'
        title='Ziriwa'
      >
        Z
      </Link>
    )
  }

  return <Logo href='/departments' />
}
