import type { Metadata } from 'next'

import Logo from '@/components/logo'
import { getMaintenanceMessage } from '@/lib/maintenance-mode'
import { Construction } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Maintenance | Ziriwa',
  description: 'Ziriwa is temporarily unavailable.',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  const message = getMaintenanceMessage()

  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center'>
      <div className='flex justify-center'>
        <Logo href='/maintenance' />
      </div>
      <h1 className='mt-8 text-6xl font-semibold tracking-tight text-foreground sm:text-3xl'>
        We&apos;ll be back soon
      </h1>
      <p className='mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground'>
        {message ?? 'We are making improvements and we will be back shortly'}
      </p>
    </main>
  )
}
