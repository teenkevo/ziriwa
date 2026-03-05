import { MainNav } from '@/features/dashboard/components/main-nav'
import { Search } from '@/features/dashboard/components/search'
import TeamSwitcher from '@/features/dashboard/components/team-switcher'
import React from 'react'
import { ModeToggle } from './modeToggle'
import { UserNav } from '@/features/dashboard/components/user-nav'
import Logo from './logo'
import { VerticalDivider } from './vertical-divider'

export default function Nav() {
  return (
    <div className='border-b'>
      <div className='flex h-16 items-center px-4'>
        <Logo href='/dashboard' />
        <VerticalDivider className='mx-8' />
        <MainNav className='mx-6' />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </div>
  )
}
