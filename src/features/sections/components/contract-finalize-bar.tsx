'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  reviewContractForFinalize,
  type ContractFinalizeIssue,
  type ContractFinalizeObjective,
} from '@/lib/contract-finalize'

interface ContractFinalizeBarProps {
  contractId: string
  status?: string
  canFinalize: boolean
  objectives?: Array<ContractFinalizeObjective | null> | null
  holdMessage?: string | null
  hiddenKeys?: string[]
  issueHref?: (issue: ContractFinalizeIssue) => string | undefined
}

export function CascadeHoldNotice({ message }: { message: string }) {
  return (
    <p className='rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50'>
      {message}
    </p>
  )
}

function FinalizeClearNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className='flex items-center gap-3 rounded-lg border border-green-600/25 bg-green-600/10 px-3 py-3'
    >
      <motion.span
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 16, delay: 0.06 }}
        className='flex h-9 w-9 shrink-0 items-center justify-center'
      >
        <CheckCircle2 className='h-8 w-8 fill-green-600 text-white [&_circle]:stroke-green-600' />
      </motion.span>
      <p className='text-sm font-medium'>No blocking issues found.</p>
    </motion.div>
  )
}

export function ContractFinalizeBar({
  contractId,
  status,
  canFinalize,
  objectives,
  holdMessage,
  hiddenKeys,
  issueHref,
}: ContractFinalizeBarProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [clearNoticeKey, setClearNoticeKey] = React.useState(0)
  const [isFinalizing, setIsFinalizing] = React.useState(false)
  const isFinalized = status === 'finalized'
  const blockers = reviewContractForFinalize(objectives, hiddenKeys).filter(
    issue => issue.severity === 'blocker',
  )

  async function finalize() {
    setIsFinalizing(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/finalize`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not finalize this contract')
      }
      const warnings: string[] = Array.isArray(data.warnings) ? data.warnings : []
      setConfirmOpen(false)
      toast.success('Contract finalized')
      for (const warning of warnings) toast.message(warning)
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not finalize this contract',
      )
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <div className='space-y-3'>
      {holdMessage ? (
        <p className='rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50'>
          {holdMessage}
        </p>
      ) : null}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className={
              isFinalized
                ? 'border-green-600/40 bg-green-600/15 text-green-700 hover:bg-green-600/15 dark:text-green-300'
                : 'border-orange-500/50 bg-orange-500/15 text-orange-600 hover:bg-orange-500/15 dark:text-orange-300'
            }
          >
            {isFinalized ? 'Finalized' : 'Draft'}
          </Badge>
          {isFinalized ? (
            <p className='text-sm text-muted-foreground'>
              This contract is locked. Assigned people can work from it.
            </p>
          ) : null}
        </div>
        {canFinalize && !isFinalized ? (
          <Button
            type='button'
            size='sm'
            disabled={isFinalizing}
            onClick={() => {
              setClearNoticeKey(key => key + 1)
              setConfirmOpen(true)
            }}
          >
            Finalize contract
          </Button>
        ) : null}
      </div>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={open => {
          if (isFinalizing) return
          setConfirmOpen(open)
        }}
      >
        <AlertDialogContent
          disableClose={isFinalizing}
          className='sm:max-w-2xl'
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockers.length > 0
                ? 'Resolve these before the contract can be finalized.'
                : 'This locks the contract. You will not be able to edit it after this. Assigned people can then start from the core activities you shared.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {blockers.length > 0 ? (
            <div className='max-h-60 overflow-y-auto rounded-md border'>
              <ul>
                {blockers.map(issue => {
                  const href = issueHref?.(issue)
                  const row = (
                    <>
                      <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-destructive' />
                      <span className='min-w-0'>
                        <span className='block font-medium'>{issue.location}</span>
                        <span className='block text-muted-foreground'>
                          {issue.message}
                        </span>
                      </span>
                    </>
                  )
                  return (
                    <li
                      key={`${issue.objectiveIndex}-${issue.initiativeIndex ?? 'i'}-${issue.activityIndex ?? 'a'}-${issue.message}`}
                    >
                      {href ? (
                        <a
                          href={href}
                          className='flex items-start gap-2 px-3 py-2 text-sm hover:bg-muted'
                          onClick={() => setConfirmOpen(false)}
                        >
                          {row}
                        </a>
                      ) : (
                        <div className='flex items-start gap-2 px-3 py-2 text-sm'>
                          {row}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <FinalizeClearNotice key={clearNoticeKey} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFinalizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isFinalizing || blockers.length > 0}
              onClick={event => {
                event.preventDefault()
                if (blockers.length > 0 || isFinalizing) return
                void finalize()
              }}
            >
              {isFinalizing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Finalize contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
