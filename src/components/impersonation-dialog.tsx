'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import type { AppRole } from '@/lib/app-role'
import { APP_ROLE_LABELS } from '@/lib/authz/types'
import { ImpersonationTransitionOverlay } from '@/components/impersonation-transition-overlay'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { dropdownSurfaceClassName } from '@/components/ui/dropdown-surface'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [isLoadingTargets, setIsLoadingTargets] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [transitionMessage, setTransitionMessage] = React.useState<string | null>(
    null,
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSelectedEmail('')
      setPickerOpen(false)
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

    // Full-document navigation so Set-Cookie on the enter redirect sticks in
    // production (fetch + JSON Set-Cookie was getting cleared by middleware /
    // subsequent requests).
    window.location.assign(
      `/api/admin/impersonate/enter?email=${encodeURIComponent(selectedEmail)}`,
    )
  }

  const selectedTarget = targets.find(row => row.email === selectedEmail)

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
              <Popover modal open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    role='combobox'
                    aria-expanded={pickerOpen}
                    aria-label='Choose a user'
                    disabled={isLoadingTargets || isSubmitting}
                    className={cn(
                      'w-full justify-between font-normal',
                      dropdownSurfaceClassName,
                    )}
                  >
                    <span className='min-w-0 truncate text-left'>
                      {selectedTarget
                        ? formatTargetLabel(selectedTarget)
                        : isLoadingTargets
                          ? 'Loading staff…'
                          : 'Choose a user'}
                    </span>
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='z-[60] w-[var(--radix-popover-trigger-width)] p-0'
                  align='start'
                >
                  <Command>
                    <CommandInput placeholder='Search by name, role, or email…' />
                    <CommandList>
                      <CommandEmpty>No matching staff.</CommandEmpty>
                      <CommandGroup>
                        {targets.map(target => {
                          const label = formatTargetLabel(target)
                          return (
                            <CommandItem
                              key={target.email}
                              value={`${target.name} ${label} ${target.email}`}
                              onSelect={() => {
                                setSelectedEmail(target.email)
                                setPickerOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4',
                                  selectedEmail === target.email
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              <span className='min-w-0 truncate'>{label}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
