'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import Logo from '@/components/logo'

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey
}

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#')) return false
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false

  const currentUrl = new URL(window.location.href)
  return (
    url.pathname !== currentUrl.pathname || url.search !== currentUrl.search
  )
}

export function RouteTransitionLoadingOverlay() {
  const pathname = usePathname()
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(false)
  }, [pathname])

  React.useEffect(() => {
    if (!loading) return

    const timeout = window.setTimeout(() => {
      setLoading(false)
    }, 10000)

    return () => window.clearTimeout(timeout)
  }, [loading])

  React.useEffect(() => {
    function handleSidebarLinkClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (isModifiedEvent(event)) return

      const target = event.target
      if (!(target instanceof Element)) return

      const sidebar = target.closest('[data-sidebar="sidebar"]')
      if (!sidebar) return

      const anchor = target.closest('a')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavigationLink(anchor)) return

      setLoading(true)
    }

    document.addEventListener('click', handleSidebarLinkClick, true)
    return () => {
      document.removeEventListener('click', handleSidebarLinkClick, true)
    }
  }, [])

  if (!loading) return null

  return (
    <div
      className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'
      role='status'
      aria-live='polite'
      aria-label='Loading page'
    >
      <div
        className='h-14 w-14 animate-spin rounded-full border-8 border-primary border-t-transparent'
        aria-hidden='true'
      />
      <div className='fixed bottom-8'>
        <Logo />
      </div>
      <span className='sr-only'>Loading...</span>
    </div>
  )
}
