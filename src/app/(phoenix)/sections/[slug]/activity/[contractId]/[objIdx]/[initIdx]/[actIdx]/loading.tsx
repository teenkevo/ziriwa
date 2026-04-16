import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className='flex flex-1 min-h-0 overflow-hidden lg:h-[calc(100vh-5rem)]'>
      <div className='flex flex-col flex-1 gap-6 p-4 md:p-8 pt-6 min-w-0 overflow-y-auto overscroll-contain'>
        <div className='space-y-4'>
          <div className='h-8 w-2/3 rounded bg-muted animate-pulse' />
          <div className='h-4 w-1/2 rounded bg-muted animate-pulse' />
          <div className='h-4 w-1/3 rounded bg-muted animate-pulse' />
        </div>
        <div className='space-y-3'>
          <div className='h-4 w-40 rounded bg-muted animate-pulse' />
          <div className='h-64 w-full rounded bg-muted animate-pulse' />
        </div>
      </div>
    </div>
  )
}
