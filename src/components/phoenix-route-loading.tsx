'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Sixtyfour } from 'next/font/google'

const sixtyFour = Sixtyfour({ subsets: ['latin'] })

/** Full-area loader used by `(phoenix)` route `loading.tsx` files — Ziriwa wordmark + spinner. */
export function PhoenixRouteLoading() {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-8 min-h-[min(70vh,36rem)] px-6 py-12'>
      <div className='flex flex-col items-center gap-5 text-center'>
        <Link href='/departments' className='inline-flex flex-col items-center'>
          <div
            className={`flex items-center -space-x-3 text-primary text-lg mb-0 leading-none ${sixtyFour.className}`}
          >
            ZIRIWA
          </div>
          <span className='text-xs font-normal ml-1 leading-none mt-1 text-muted-foreground'>
            By Data, Innovations & Projects
          </span>
        </Link>
        <Loader2
          className='h-10 w-10 animate-spin text-primary'
          aria-label='Loading'
        />
      </div>
    </div>
  )
}
