import { CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface AllClearStateProps {
  compact?: boolean
  title?: string
  description?: string
}

export function AllClearState({
  compact = false,
  title = 'All good',
  description = 'Nothing is overdue or blocked right now.',
}: AllClearStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12',
      )}
    >
      <CheckCircle2
        className={cn(
          'text-emerald-600 dark:text-emerald-500',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
        aria-hidden
      />
      <p
        className={cn(
          'mt-3 font-medium text-foreground',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        {title}
      </p>
      <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
        {description}
      </p>
    </div>
  )
}
