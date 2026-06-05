import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceProjectsSkeleton() {
  return (
    <div className='space-y-4' aria-busy aria-label='Loading projects'>
      <div className='divide-y divide-border rounded-2xl border border-border bg-muted/30'>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className='flex items-center gap-4 px-4 py-4 sm:px-5'
          >
            <Skeleton className='size-11 shrink-0 rounded-full' />
            <div className='min-w-0 flex-1 space-y-2'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-24' />
            </div>
            <Skeleton className='h-7 w-14 rounded-full' />
          </div>
        ))}
      </div>
    </div>
  )
}
