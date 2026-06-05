'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'

import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WorkspaceSelectionShellProps {
  /** When set, back navigates here. */
  backHref?: string
  /** Client-side back (e.g. workspace step). Takes precedence over `backHref`. */
  onBack?: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function WorkspaceSelectionShell({
  backHref,
  onBack,
  title,
  subtitle,
  children,
  className,
}: WorkspaceSelectionShellProps) {
  const isBackEnabled = Boolean(onBack || backHref)

  return (
    <div className='flex min-h-svh items-center justify-center bg-muted-foreground/10 p-4 sm:p-8'>
      <div
        className={cn(
          'flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl ring-1 ring-primary-foreground/10',
          'min-h-[min(640px,90svh)]',
          className,
        )}
      >
        <div className='flex min-w-0 flex-1 flex-col bg-card px-8 py-8 text-card-foreground sm:px-12 sm:py-10'>
          <div className='mb-8 flex items-center justify-between gap-4'>
            <Logo href='/workspace' />
            <SignOutButton redirectUrl='/'>
              <Button
                variant='ghost'
                size='sm'
                className='shrink-0 text-muted-foreground hover:text-foreground'
              >
                Log out
              </Button>
            </SignOutButton>
          </div>

          <div className='mb-8 space-y-2'>
            <h1 className='text-foreground text-2xl font-semibold tracking-tight transition-opacity duration-200 sm:text-3xl'>
              {title}
            </h1>
            {subtitle ? (
              <p className='text-muted-foreground max-w-md text-sm sm:text-sm'>
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className='flex flex-1 flex-col'>{children}</div>

          <div className='mt-8 border-t border-border pt-6'>
            {isBackEnabled ? (
              onBack ? (
                <Button
                  type='button'
                  variant='outline'
                  className='gap-2 rounded-full'
                  onClick={onBack}
                >
                  <ArrowLeft className='size-4' />
                  Back
                </Button>
              ) : (
                <Button
                  variant='outline'
                  className='gap-2 rounded-full'
                  asChild
                >
                  <Link href={backHref!}>
                    <ArrowLeft className='size-4' />
                    Back
                  </Link>
                </Button>
              )
            ) : (
              <Button
                type='button'
                variant='outline'
                className='gap-2 rounded-full'
                disabled
                aria-disabled
              >
                <ArrowLeft className='size-4' />
                Back
              </Button>
            )}
          </div>
        </div>

        <aside
          className='relative hidden w-[42%] shrink-0 flex-col justify-end overflow-hidden bg-primary p-10 lg:flex'
          aria-hidden
        >
          <div className='pointer-events-none absolute -right-8 -top-8 size-48 rounded-3xl bg-primary-foreground/10' />
          <div className='pointer-events-none absolute right-12 top-24 size-32 rounded-2xl bg-primary-foreground/5' />
          <blockquote className='relative z-10 max-w-sm text-sm leading-relaxed text-foreground'>
            <p className='mb-4'>
              Workspaces keep core contractual work and project work separate.
            </p>
            <footer className='text-sm font-bold text-background'>
              Ziriwa by DIP
            </footer>
          </blockquote>
        </aside>
      </div>
    </div>
  )
}
