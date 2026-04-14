import { Suspense } from 'react'
import { SidebarHeader } from '@/components/ui/sidebar'
import { SidebarBrand } from '@/components/sidebar-brand'
import { DepartmentSwitcherWrapper } from '@/features/dashboard/components/department-switcher-wrapper'
import { Skeleton } from '@/components/ui/skeleton'

export function SidebarChromeHeader() {
  return (
    <SidebarHeader className='gap-2 border-b border-sidebar-border p-2'>
      <div className='flex items-center gap-2 px-1 py-4'>
        <SidebarBrand />
      </div>
      {/* <div className='px-1'>
        <Suspense fallback={<Skeleton className='h-9 w-full' />}>
          <DepartmentSwitcherWrapper />
        </Suspense>
      </div> */}
    </SidebarHeader>
  )
}
