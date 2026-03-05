import { Metadata } from 'next'
import Nav from '@/components/nav'
import SiteHeader from '@/components/site-header'

//TODO: work on per page metadata below, this layout is shared
export const metadata: Metadata = {
  title: 'Tereka by Phoenix',
  description: 'Collaborative investing made simple ',
}

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
