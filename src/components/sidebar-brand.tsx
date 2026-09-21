'use client'

import Logo from '@/components/logo'
import { useSidebar } from '@/components/ui/sidebar'
import { useViewer } from '@/contexts/viewer-context'

export function SidebarBrand() {
  const { state } = useSidebar()
  const { isImpersonating } = useViewer()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isImpersonating) return
    e.preventDefault()
    // Hard navigate only — never put clear-impersonation in Link href
    // (prefetch would wipe the cookie).
    window.location.assign('/workspace/clear-impersonation')
  }

  // Keep /workspace in the href while impersonating so Link never targets
  // the cookie-clearing route. Click handler exits impersonation instead.
  const href = '/workspace'

  if (state === 'collapsed') {
    return (
      <a
        href={href}
        onClick={handleClick}
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/40 text-xs font-bold text-primary'
        title='Ziriwa'
      >
        Z
      </a>
    )
  }

  return <Logo href={href} prefetch={false} onClick={handleClick} />
}
