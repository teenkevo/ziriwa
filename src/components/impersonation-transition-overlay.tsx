'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'

import Logo from '@/components/logo'

interface ImpersonationTransitionOverlayProps {
  message: string
}

export function ImpersonationTransitionOverlay({
  message,
}: ImpersonationTransitionOverlayProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const content = (
    <div
      className='fixed inset-0 z-[200] flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6'
      role='status'
      aria-live='polite'
      aria-busy='true'
    >
      <Loader2
        className='h-14 w-14 animate-spin text-primary'
        aria-hidden='true'
      />
      <p className='max-w-sm text-center text-sm font-medium text-muted-foreground'>
        {message}
      </p>
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
