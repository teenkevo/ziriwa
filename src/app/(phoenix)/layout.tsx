export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { cookies } from 'next/headers'
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar'
import { SidebarChromeHeader } from '@/components/sidebar-chrome-header'
import { AppSidebarFooter } from '@/components/app-sidebar-footer'
import { AppSidebarNavWrapper } from '@/components/app-sidebar-nav-wrapper'
import { AppTopBarShell } from '@/components/app-top-bar-shell'
import { AppBreadcrumbProvider } from '@/contexts/app-breadcrumb-context'
import { RouteTransitionLoadingOverlay } from '@/components/route-transition-loading-overlay'

export const metadata: Metadata = {
  title: 'Ziriwa by DIP',
  description: 'Your daily companion for work',
}

interface LayoutProps {
  children: React.ReactNode
}

export default async function Layout({ children }: LayoutProps) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar:state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible='icon' variant='inset'>
        <SidebarChromeHeader />
        <AppSidebarNavWrapper />
        <AppSidebarFooter />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <AppBreadcrumbProvider>
          <RouteTransitionLoadingOverlay />
          <AppTopBarShell />
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {children}
          </div>
        </AppBreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
