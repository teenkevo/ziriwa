'use client'

import Link from 'next/link'
import Logo from '@/components/logo'
import { useSidebar } from '@/components/ui/sidebar'
import { useViewer } from '@/contexts/viewer-context'

export function SidebarBrand() {
  const { state } = useSidebar()
  const { isImpersonating } = useViewer()
  // While impersonating, exit via clear-impersonation (never prefetch /workspace —
  // production prefetch used to clear the impersonation cookie on that page).
  const href = isImpersonating ? '/workspace/clear-impersonation' : '/workspace'

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isImpersonating) return
    e.preventDefault()
    window.location.assign('/workspace/clear-impersonation')
  }

  if (state === 'collapsed') {
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={handleClick}
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/40 text-xs font-bold text-primary'
        title='Ziriwa'
      >
        Z
      </Link>
    )
  }

  return <Logo href={href} prefetch={false} onClick={handleClick} />
}
