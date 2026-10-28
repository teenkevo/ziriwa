'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface RewriteResult {
  patchedDocuments: number
  patchedActivities: number
  kpi: number
  measurable: number
  remaining: number
  failures?: { id: string; message: string }[]
  error?: string
}

export function RewriteLegacyActivityTypesButton() {
  const [isRunning, setIsRunning] = React.useState(false)
  const [summary, setSummary] = React.useState<string | null>(null)

  async function onClick() {
    setIsRunning(true)
    setSummary(null)
    try {
      const response = await fetch('/api/admin/rewrite-legacy-activity-types', {
        method: 'POST',
      })
      const data = (await response.json()) as RewriteResult
      if (!response.ok) {
        toast.error(data.error ?? 'Activity type rewrite failed')
        setSummary(data.error ?? 'Activity type rewrite failed')
        return
      }
      const failureCount = data.failures?.length ?? 0
      const leftover = data.remaining > 0
      const nextSummary =
        failureCount > 0 || leftover
          ? `Rewrote ${data.patchedActivities} activities. ${failureCount} contracts failed, and ${data.remaining} still have a legacy type.`
          : data.patchedActivities === 0
            ? 'Nothing to rewrite. Stored types are already core or cross-cutting.'
            : `Rewrote ${data.patchedActivities} activities on ${data.patchedDocuments} contracts (${data.measurable} measurable, ${data.kpi} KPI).`
      setSummary(nextSummary)
      if (failureCount > 0 || leftover) toast.error(nextSummary)
      else toast.success(nextSummary)
    } catch {
      toast.error('Activity type rewrite failed')
      setSummary('Activity type rewrite failed')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardContent className='flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Measurable activity types</p>
          <p className='text-sm text-muted-foreground'>
            Store KPI and measurable activities as core on this deployment.
            Cross-cutting stays. Remove this after production is rewritten.
          </p>
          {summary ? (
            <p className='text-sm text-foreground'>{summary}</p>
          ) : null}
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => void onClick()}
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className='animate-spin' /> : null}
          Rewrite activity types
        </Button>
      </CardContent>
    </Card>
  )
}
