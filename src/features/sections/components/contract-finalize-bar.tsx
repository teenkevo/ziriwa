'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
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
  /** Hide the standalone finalize button when the page owns a contract actions menu. */
  hidePrimaryActions?: boolean
  /** Rendered on the far right of the draft badge. */
  contractActions?: React.ReactNode
  /** Increment to open the finalize confirmation. */
  finalizeRequest?: number
  /** Increment to open the unfinalize confirmation. */
  unfinalizeRequest?: number
}

function CodeCell({
  code,
  emphasize,
}: {
  code?: string
  emphasize?: boolean
}) {
  if (!code) return <span className='text-muted-foreground'>—</span>
  return (
    <span
      className={
        emphasize
          ? 'font-medium text-destructive'
          : 'text-muted-foreground'
      }
    >
      {code}
    </span>
  )
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
    >
      <div className='flex items-center gap-3 rounded-lg border border-green-600/25 bg-green-600/10 px-3 py-3'>
        <motion.span
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 16, delay: 0.06 }}
        >
          <span className='flex h-9 w-9 shrink-0 items-center justify-center'>
            <CheckCircle2 className='h-8 w-8 fill-green-600 text-white [&_circle]:stroke-green-600' />
          </span>
        </motion.span>
        <p className='text-sm font-medium'>No blocking issues found.</p>
      </div>
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
  hidePrimaryActions = false,
  contractActions,
  finalizeRequest = 0,
  unfinalizeRequest = 0,
}: ContractFinalizeBarProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [unfinalizeOpen, setUnfinalizeOpen] = React.useState(false)
  const [clearNoticeKey, setClearNoticeKey] = React.useState(0)
  const [isFinalizing, setIsFinalizing] = React.useState(false)
  const [isUnfinalizing, setIsUnfinalizing] = React.useState(false)
  const isFinalized = status === 'finalized'
  const seenFinalizeRequest = React.useRef(finalizeRequest)
  const seenUnfinalizeRequest = React.useRef(unfinalizeRequest)
  const blockers = reviewContractForFinalize(objectives, hiddenKeys).filter(
    issue => issue.severity === 'blocker',
  )

  React.useEffect(() => {
    if (seenFinalizeRequest.current === finalizeRequest) return
    seenFinalizeRequest.current = finalizeRequest
    if (!canFinalize || isFinalized) return
    setClearNoticeKey(key => key + 1)
    setConfirmOpen(true)
  }, [finalizeRequest, canFinalize, isFinalized])

  React.useEffect(() => {
    if (seenUnfinalizeRequest.current === unfinalizeRequest) return
    seenUnfinalizeRequest.current = unfinalizeRequest
    if (!canFinalize || !isFinalized) return
    setUnfinalizeOpen(true)
  }, [unfinalizeRequest, canFinalize, isFinalized])

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

  async function unfinalize() {
    setIsUnfinalizing(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/unfinalize`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not unfinalize this contract')
      }
      setUnfinalizeOpen(false)
      toast.success('Contract reopened')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not unfinalize this contract',
      )
    } finally {
      setIsUnfinalizing(false)
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
        </div>
        {contractActions}
        {canFinalize && !isFinalized && !hidePrimaryActions ? (
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
        {canFinalize && isFinalized && !hidePrimaryActions ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isUnfinalizing}
            onClick={() => setUnfinalizeOpen(true)}
          >
            Unfinalize
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
          className='sm:max-w-4xl'
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockers.length > 0
                ? 'Resolve these before the contract can be finalized.'
                : 'This action locks the contract and cascades it to assignees for contracting'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {blockers.length > 0 ? (
            <div className='max-h-72 overflow-y-auto rounded-md border'>
              <table className='w-full text-sm'>
                <thead className='sticky top-0 bg-background'>
                  <tr className='border-b'>
                    <th className='w-10 px-3 py-2' />
                    <th className='px-3 py-2 text-left font-medium text-muted-foreground'>
                      Objective
                    </th>
                    <th className='px-3 py-2 text-left font-medium text-muted-foreground'>
                      Initiative
                    </th>
                    <th className='px-3 py-2 text-left font-medium text-muted-foreground'>
                      Measurable activity
                    </th>
                    <th className='px-3 py-2 text-left font-medium text-muted-foreground'>
                      Action required
                    </th>
                    <th className='w-8 px-2 py-2' />
                  </tr>
                </thead>
                <tbody>
                  {blockers.map(issue => {
                    const href = issueHref?.(issue)
                    return (
                      <tr
                        key={`${issue.objectiveIndex}-${issue.initiativeIndex ?? 'i'}-${issue.activityIndex ?? 'a'}-${issue.message}`}
                        className={
                          href
                            ? 'cursor-pointer border-b last:border-0 hover:bg-muted'
                            : 'border-b last:border-0'
                        }
                        onClick={() => {
                          if (!href) return
                          setConfirmOpen(false)
                          router.push(href)
                        }}
                      >
                        <td className='px-3 py-2 align-top'>
                          <AlertTriangle
                            className='mt-0.5 h-4 w-4 text-destructive'
                            aria-label='Needs attention'
                          />
                        </td>
                        <td className='whitespace-nowrap px-3 py-2 align-top'>
                          <CodeCell
                            code={issue.objectiveCode}
                            emphasize={issue.subject === 'objective'}
                          />
                        </td>
                        <td className='whitespace-nowrap px-3 py-2 align-top'>
                          <CodeCell
                            code={
                              issue.subject === 'initiative' ||
                              issue.subject === 'activity'
                                ? issue.code
                                : undefined
                            }
                            emphasize={issue.subject === 'initiative'}
                          />
                        </td>
                        <td className='whitespace-nowrap px-3 py-2 align-top'>
                          <CodeCell
                            code={issue.activityCode}
                            emphasize={issue.subject === 'activity'}
                          />
                        </td>
                        <td className='px-3 py-2 align-top text-muted-foreground'>
                          {issue.message}
                        </td>
                        <td className='px-2 py-2 align-top'>
                          {href ? (
                            <ChevronRight
                              className='mt-0.5 h-4 w-4 text-muted-foreground'
                              aria-label='Open'
                            />
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
      <AlertDialog
        open={unfinalizeOpen}
        onOpenChange={open => {
          if (isUnfinalizing) return
          setUnfinalizeOpen(open)
        }}
      >
        <AlertDialogContent disableClose={isUnfinalizing}>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfinalize this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This reopens the contract for editing. Assigned people will not
              see the shared activities until you finalize it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnfinalizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUnfinalizing}
              onClick={event => {
                event.preventDefault()
                if (isUnfinalizing) return
                void unfinalize()
              }}
            >
              {isUnfinalizing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Unfinalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
