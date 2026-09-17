'use client'

import { SignedIn } from '@clerk/nextjs'

import { FinancialYearSwitcher } from '@/components/financial-year-switcher'

/** Sits in the sidebar rail above the first nav item (Dashboard). */
export function SidebarFinancialYear() {
  return (
    <SignedIn>
      <div className='px-2 pb-1 pt-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pt-2'>
        <FinancialYearSwitcher placement='sidebar' />
      </div>
    </SignedIn>
  )
}
