'use client'

import * as React from 'react'
import { AlertTriangle, X } from 'lucide-react'

import { ImpersonationTransitionOverlay } from '@/components/impersonation-transition-overlay'
import { Button } from '@/components/ui/button'
import { APP_ROLE_LABELS } from '@/lib/authz/types'
import type { AppRole } from '@/lib/app-role'

interface ImpersonationBannerProps {
  targetName: string
  targetEmail: string
  targetRole: AppRole | null
}

export function ImpersonationBanner({
  targetName,
  targetEmail,
  targetRole,
}: ImpersonationBannerProps) {
  const [transitionMessage, setTransitionMessage] = React.useState<string | null>(
    null,
  )

  async function stopImpersonation() {
    setTransitionMessage('Returning to your account…')
    try {
      const res = await fetch('/api/admin/impersonate', { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { redirect?: string }
      window.location.assign(data.redirect || '/departments')
    } catch {
      setTransitionMessage(null)
    }
  }

  const roleLabel = targetRole ? APP_ROLE_LABELS[targetRole] : 'User'

  return (
    <>
      {transitionMessage ? (
        <ImpersonationTransitionOverlay message={transitionMessage} />
      ) : null}

      <div className='border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50'>
        <div className='mx-auto flex max-w-screen-2xl items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2 text-sm'>
            <AlertTriangle className='h-4 w-4 shrink-0' />
            <p className='min-w-0'>
              Viewing as{' '}
              <span className='font-semibold'>
                {targetName} ({roleLabel})
              </span>
              <span className='hidden text-amber-800/80 sm:inline dark:text-amber-100/80'>
                {' '}
                · {targetEmail}
              </span>
            </p>
          </div>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='shrink-0 border-amber-500/50 bg-white/70 hover:bg-white dark:bg-amber-950/60 dark:hover:bg-amber-950'
            onClick={() => void stopImpersonation()}
            disabled={Boolean(transitionMessage)}
          >
            <X className='h-4 w-4' />
            Stop impersonating
          </Button>
        </div>
      </div>
    </>
  )
}
