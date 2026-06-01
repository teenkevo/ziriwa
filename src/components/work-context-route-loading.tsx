'use client'

import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import Logo from '@/components/logo'

/**
 * Shown by Next.js `loading.tsx` while the server re-renders after a work-context change.
 */
export function WorkContextRouteLoading() {
  const searchParams = useSearchParams()
  const workContext = searchParams.get('workContext')
  const statusMessage =
    workContext === 'acting'
      ? 'Switching to acting duties…'
      : workContext === 'own'
        ? 'Switching to your work…'
        : null

  return (
    <div className='flex min-h-[80vh] flex-col items-center justify-center gap-4'>
      <Loader2
        className='h-14 w-14 animate-spin text-primary'
        role='status'
        aria-label='Loading'
      />
      {statusMessage ? (
        <p className='text-sm font-medium text-muted-foreground'>
          {statusMessage}
        </p>
      ) : null}
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )
}
