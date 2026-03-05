import Logo from './logo'
import { MainNav } from '@/features/dashboard/components/main-nav'
import MobileNav from './mobile-nav'
import { Search } from '@/features/dashboard/components/search'
import { ModeToggle } from './modeToggle'
import { UserNav } from '@/features/dashboard/components/user-nav'
import { VerticalDivider } from './vertical-divider'
import { DivisionSwitcherWrapper } from '@/features/dashboard/components/division-switcher-wrapper'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export default function SiteHeader() {
  return (
    <header className='flex items-center justify-between p-4 md:px-6 lg:px-8 border-b'>
      <div className='flex space-x-5'>
        <Logo href='/dashboard' />
        <VerticalDivider className='h-9 hidden md:flex' />
        <DivisionSwitcherWrapper />
        <MainNav />
      </div>

      <div className='ml-auto flex items-center space-x-4 mr-2'>
        {/* <Search /> */}
        <ModeToggle />
        <SignedIn>
          <UserNav />
        </SignedIn>
        <SignedOut>
          <SignInButton mode='modal'>
            <Button variant='outline'>Sign In</Button>
          </SignInButton>
        </SignedOut>
      </div>

      <MobileNav />
    </header>
  )
}
