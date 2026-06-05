'use client'

import * as React from 'react'

import { WorkspaceSignInLoading } from '@/components/workspace-sign-in-loading'
import { Button } from '@/components/ui/button'

const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function AuthContinueClient() {
  const [message, setMessage] = React.useState('Signing you in…')
  const [error, setError] = React.useState<string | null>(null)
  const attemptRef = React.useRef(0)

  const resolveContinue = React.useCallback(async () => {
    setError(null)
    setMessage('Signing you in…')
    attemptRef.current = 0

    while (attemptRef.current < MAX_ATTEMPTS) {
      attemptRef.current += 1

      try {
        const res = await fetch('/api/auth/continue', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (res.status === 401 && attemptRef.current < MAX_ATTEMPTS) {
          setMessage('Finishing sign-in…')
          await sleep(RETRY_DELAY_MS * attemptRef.current)
          continue
        }

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Could not open your workspace',
          )
        }

        const data = (await res.json()) as { redirect?: string }
        if (!data.redirect?.trim()) {
          throw new Error('No workspace destination returned')
        }

        setMessage('Opening your workspace…')
        window.location.assign(data.redirect)
        return
      } catch (err) {
        if (attemptRef.current >= MAX_ATTEMPTS) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not open your workspace',
          )
          return
        }

        setMessage('Finishing sign-in…')
        await sleep(RETRY_DELAY_MS * attemptRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    void resolveContinue()
  }, [resolveContinue])

  if (error) {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-muted-foreground/10 px-6'>
        <p className='max-w-sm text-center text-sm font-medium text-destructive'>
          {error}
        </p>
        <Button type='button' onClick={() => void resolveContinue()}>
          Try again
        </Button>
      </div>
    )
  }

  return <WorkspaceSignInLoading message={message} />
}
