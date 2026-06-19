'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      icons={{
        success: (
          <CheckCircle2
            className='size-4 shrink-0 text-green-600 dark:text-green-500'
            aria-hidden
          />
        ),
        error: (
          <XCircle className='size-4 shrink-0 text-destructive' aria-hidden />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:border-green-600/35 dark:group-[.toaster]:border-green-500/40',
          error:
            'group-[.toaster]:border-destructive/60 group-[.toaster]:bg-destructive',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
