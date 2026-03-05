import Logo from '@/components/logo'
import { Sixtyfour } from 'next/font/google'

const sixtyFour = Sixtyfour({ subsets: ['latin'] })

export default function Loading() {
  return (
    <div className='flex min-h-[80vh] flex-col items-center justify-center'>
      {/* Spinner */}
      <div
        className='h-14 w-14 animate-spin rounded-full border-8 border-primary border-t-transparent'
        role='status'
        aria-label='Loading'
      >
        <span className='sr-only'>Loading...</span>
      </div>

      {/* Brand text */}
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )
}
