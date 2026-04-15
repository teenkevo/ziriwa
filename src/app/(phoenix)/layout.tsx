import { Metadata } from 'next'
import { cookies } from 'next/headers'
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar'
import { SidebarChromeHeader } from '@/components/sidebar-chrome-header'
import { AppSidebarNavWrapper } from '@/components/app-sidebar-nav-wrapper'
import { AppTopBar } from '@/components/app-top-bar'
import { AppBreadcrumbProvider } from '@/contexts/app-breadcrumb-context'

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
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <AppBreadcrumbProvider>
          <AppTopBar />
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {children}
          </div>
        </AppBreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
