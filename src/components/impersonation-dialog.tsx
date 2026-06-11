'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import type { AppRole } from '@/lib/app-role'
import { APP_ROLE_LABELS } from '@/lib/authz/types'
import { ImpersonationTransitionOverlay } from '@/components/impersonation-transition-overlay'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ImpersonationTarget {
  email: string
  name: string
  role: AppRole | null
}

function formatTargetLabel(target: ImpersonationTarget): string {
  const roleLabel = target.role ? APP_ROLE_LABELS[target.role] : 'No role'
  return `${target.name} (${roleLabel})`
}

function switchingMessage(target: ImpersonationTarget): string {
  const roleLabel = target.role ? APP_ROLE_LABELS[target.role] : 'user'
  return `Switching to ${target.name} (${roleLabel})…`
}

export function ImpersonationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [targets, setTargets] = React.useState<ImpersonationTarget[]>([])
  const [selectedEmail, setSelectedEmail] = React.useState('')
  const [isLoadingTargets, setIsLoadingTargets] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [transitionMessage, setTransitionMessage] = React.useState<string | null>(
    null,
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSelectedEmail('')
      setError(null)
      return
    }

    let cancelled = false
    setIsLoadingTargets(true)
    setError(null)

    void fetch('/api/admin/impersonate', { cache: 'no-store' })
      .then(async res => {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          targets?: ImpersonationTarget[]
        }
        if (!res.ok) {
          throw new Error(data.error || 'Could not load staff')
        }
        if (!cancelled) {
          setTargets(data.targets ?? [])
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load staff',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTargets(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  async function handleImpersonate() {
    if (!selectedEmail) return

    const target = targets.find(row => row.email === selectedEmail)
    if (!target) return

    setIsSubmitting(true)
    setError(null)
    setTransitionMessage(switchingMessage(target))
    onOpenChange(false)

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        redirect?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Could not start impersonation')
      }
      window.location.assign(data.redirect || '/departments')
    } catch (err) {
      setTransitionMessage(null)
      setError(
        err instanceof Error ? err.message : 'Could not start impersonation',
      )
      onOpenChange(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {transitionMessage ? (
        <ImpersonationTransitionOverlay message={transitionMessage} />
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Impersonate user</DialogTitle>
            <DialogDescription>
              View and act in the app as another staff member. Your admin session
              stays signed in; actions are audited.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Select
                value={selectedEmail}
                onValueChange={setSelectedEmail}
                disabled={isLoadingTargets || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingTargets ? 'Loading staff…' : 'Choose a user'
                    }
                  />
                </SelectTrigger>
                <SelectContent className='max-h-72'>
                  {targets.map(target => (
                    <SelectItem key={target.email} value={target.email}>
                      {formatTargetLabel(target)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p className='text-sm text-destructive'>{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleImpersonate()}
              disabled={!selectedEmail || isSubmitting || isLoadingTargets}
            >
              {isSubmitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : null}
              Impersonate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
