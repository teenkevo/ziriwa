'use client'

import * as React from 'react'
import { useClerk } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'

export function SignOutButton({
  redirectUrl = '/',
  className,
  children = 'Log out',
}: {
  redirectUrl?: string
  className?: string
  children?: React.ReactNode
}) {
  const { signOut } = useClerk()
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await fetch('/api/admin/impersonate', {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => undefined)
      await signOut({ redirectUrl })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className={className}
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Logging out…' : children}
    </Button>
  )
}
