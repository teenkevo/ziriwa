'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WorkspaceOptionRowProps {
  icon: React.ReactNode
  name: string
  meta?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  actionLabel?: string
  className?: string
}

export function WorkspaceOptionRow({
  icon,
  name,
  meta,
  href,
  onClick,
  disabled,
  loading,
  actionLabel = 'Join',
  className,
}: WorkspaceOptionRowProps) {
  const action = (
    <Button
      type='button'
      size={loading ? 'icon' : 'sm'}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full transition-all duration-200 ease-out',
        loading
          ? 'size-7 [&_svg]:size-3.5'
          : 'h-7 min-w-[3.25rem] px-3 text-xs font-medium',
      )}
      aria-busy={loading}
      aria-label={loading ? `Opening ${name}` : actionLabel}
    >
      {loading ? (
        <Loader2 className='animate-spin' aria-hidden />
      ) : (
        actionLabel
      )}
    </Button>
  )

  return (
    <div className={cn('flex items-center gap-4 px-4 py-4 sm:px-5', className)}>
      <div className='flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted'>
        {icon}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate font-medium text-foreground'>{name}</p>
        {meta ? (
          <p className='text-muted-foreground truncate text-xs'>{meta}</p>
        ) : null}
      </div>
      {href ? (
        <Button
          asChild
          size='sm'
          className='h-7 min-w-[3.25rem] shrink-0 rounded-full px-3 text-xs font-medium'
        >
          {/* Full document navigation so Set-Cookie on /workspace/enter is applied */}
          <a href={href}>{actionLabel}</a>
        </Button>
      ) : (
        action
      )}
    </div>
  )
}
