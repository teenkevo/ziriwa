export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { Suspense } from 'react'
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
import {
  WorkspaceRouteNavigationOverlay,
  WorkspaceRouteNavigationProvider,
} from '@/contexts/workspace-route-navigation-context'
import { DelegationSidebarProvider } from '@/contexts/delegation-sidebar-context'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { ViewerProvider } from '@/contexts/viewer-context'

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
  const superadmin = await isSuperadmin()

  return (
    <ViewerProvider isSuperadmin={superadmin}>
      <DelegationSidebarProvider>
        <WorkspaceRouteNavigationProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <Sidebar collapsible='icon' variant='inset'>
              <SidebarChromeHeader />
              <Suspense fallback={null}>
                <AppSidebarNavWrapper />
              </Suspense>
              <AppSidebarFooter />
              <SidebarRail />
            </Sidebar>
            <SidebarInset>
              <AppBreadcrumbProvider>
                <AppTopBarShell />
                <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
                  <Suspense fallback={null}>{children}</Suspense>
                  <WorkspaceRouteNavigationOverlay />
                </div>
              </AppBreadcrumbProvider>
            </SidebarInset>
          </SidebarProvider>
        </WorkspaceRouteNavigationProvider>
      </DelegationSidebarProvider>
    </ViewerProvider>
  )
}
