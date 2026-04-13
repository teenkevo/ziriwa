import { Metadata } from 'next'
import Nav from '@/components/nav'
import SiteHeader from '@/components/site-header'

//TODO: work on per page metadata below, this layout is shared
export const metadata: Metadata = {
  title: 'Ziriwa by DIP',
  description: 'Your daily companion for work',
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
