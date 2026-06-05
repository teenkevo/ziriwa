import { Loader2 } from 'lucide-react'

import Logo from '@/components/logo'

interface WorkspaceSignInLoadingProps {
  message?: string
}

/** Full-screen loader after sign-in while workspace routing runs. */
export function WorkspaceSignInLoading({
  message = 'Opening your workspace…',
}: WorkspaceSignInLoadingProps) {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-muted-foreground/10 px-6'>
      <Loader2
        className='h-14 w-14 animate-spin text-primary'
        role='status'
        aria-live='polite'
        aria-label={message}
      />
      <p className='max-w-sm text-center text-sm font-medium text-muted-foreground'>
        {message}
      </p>
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )
}
