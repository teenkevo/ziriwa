'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'

/**
 * Hard-navigates through clear-impersonation so cookies apply, then lands on
 * /workspace. Soft Next.js navigations previously looped
 * /workspace ↔ /workspace/clear-impersonation and burned API/Sanity usage.
 *
 * Uses a button (not Link) so Next.js never prefetches the clear route —
 * that prefetch was deleting the impersonation cookie in production.
 */
export function SwitchWorkspaceButton({
  className,
}: {
  className?: string
}) {
  const [isSwitching, setIsSwitching] = React.useState(false)

  function handleClick() {
    if (isSwitching) return
    setIsSwitching(true)
    window.location.assign('/workspace/clear-impersonation')
  }

  return (
    <>
      {isSwitching ? (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-background'
          role='status'
          aria-live='polite'
          aria-busy='true'
        >
          <WorkspaceRouteLoading />
        </div>
      ) : null}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className={className}
        disabled={isSwitching}
        onClick={handleClick}
      >
        {isSwitching ? (
          <>
            <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            Switching…
          </>
        ) : (
          'Switch workspace'
        )}
      </Button>
    </>
  )
}
