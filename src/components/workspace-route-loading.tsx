import { Loader2 } from 'lucide-react'

import Logo from '@/components/logo'

/** Full-page loading UI used by route `loading.tsx` and client navigation overlays. */
export function WorkspaceRouteLoading() {
  return (
    <div className='flex min-h-[80vh] flex-col items-center justify-center gap-4'>
      <Loader2
        className='h-14 w-14 animate-spin text-primary'
        role='status'
        aria-label='Loading'
      />
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )
}
