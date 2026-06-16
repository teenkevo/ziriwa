'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Table2, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AddStakeholderDialog } from './components/add-stakeholder-dialog'
import { StakeholderEngagementTable } from './components/stakeholder-engagement-table'
import { StakeholderMatrix } from './components/stakeholder-matrix'
import { AssignActionPointsDialog } from './components/assign-action-points-dialog'
import { StakeholderMinutesDialog } from './components/stakeholder-minutes-dialog'
import { SubmitReportDialog } from './components/submit-report-dialog'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import type {
  StakeholderEngagement,
  StakeholderEntry,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type StaffOption = { _id: string; fullName?: string; staffId?: string }
type InitiativeOption = { code: string; title: string }

interface StakeholderEngagementContentProps {
  /** Section id (mainstream section workspace only). */
  sectionId?: string
  /** Project id (PM/DPM and project workstreams share one matrix). */
  projectId?: string
  scopeName: string
  scopeUnit?: 'section' | 'project' | 'workstream'
  /** When false, empty state directs users to PM/DPM instead of creating a matrix. */
  canBootstrapEngagement?: boolean
  engagement: StakeholderEngagement | null
  staffOptions: StaffOption[]
  initiatives?: InitiativeOption[]
  sprints?: WeeklySprint[]
  viewerStaffId?: string
}

export function StakeholderEngagementContent({
  sectionId,
  projectId,
  scopeName,
  scopeUnit = sectionId ? 'section' : 'project',
  canBootstrapEngagement = true,
  engagement,
  staffOptions,
  initiatives = [],
  sprints = [],
  viewerStaffId,
}: StakeholderEngagementContentProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<'table' | 'matrix'>('table')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editingEntry, setEditingEntry] =
    React.useState<StakeholderEntry | null>(null)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [reportEntry, setReportEntry] = React.useState<StakeholderEntry | null>(
    null,
  )
  const [reportIndex, setReportIndex] = React.useState<number | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false)
  const [actionPointsEntry, setActionPointsEntry] =
    React.useState<StakeholderEntry | null>(null)
  const [actionPointsIndex, setActionPointsIndex] = React.useState<
    number | null
  >(null)
  const [actionPointsDialogOpen, setActionPointsDialogOpen] =
    React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [minutesEntry, setMinutesEntry] = React.useState<StakeholderEntry | null>(
    null,
  )
  const [minutesIndex, setMinutesIndex] = React.useState<number | null>(null)
  const [minutesDialogOpen, setMinutesDialogOpen] = React.useState(false)

  const stakeholders = engagement?.stakeholders ?? []
  const currentFY =
    engagement?.financialYearLabel ?? getCurrentFinancialYear().label

  const handleCreateEngagement = async () => {
    if (!sectionId && !projectId) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/stakeholder-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          projectId ? { projectId } : { sectionId: sectionId! },
        ),
      })
      // TODO: Map Engagements to Auto Reporting
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create engagement')
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create engagement')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = (entry: StakeholderEntry, index: number) => {
    setEditingEntry(entry)
    setEditingIndex(index)
    setAddDialogOpen(true)
  }

  const handleAddSuccess = () => {
    setEditingEntry(null)
    setEditingIndex(null)
    router.refresh()
  }

  const handleReport = (entry: StakeholderEntry, index: number) => {
    setReportEntry(entry)
    setReportIndex(index)
    setReportDialogOpen(true)
  }

  const handleActionPoints = (entry: StakeholderEntry, index: number) => {
    setActionPointsEntry(entry)
    setActionPointsIndex(index)
    setActionPointsDialogOpen(true)
  }

  const handleMinutes = (entry: StakeholderEntry, index: number) => {
    setMinutesEntry(entry)
    setMinutesIndex(index)
    setMinutesDialogOpen(true)
  }

  if (!engagement) {
    if (!canBootstrapEngagement) {
      return (
        <p className='text-muted-foreground text-sm'>
          No stakeholder engagement matrix for {scopeName} in {currentFY}. Your
          project manager or deputy project manager needs to create the project
          matrix first.
        </p>
      )
    }

    return (
      <div>
        <p className='text-muted-foreground mb-4 text-sm'>
          No stakeholder engagement matrix for {scopeName} in {currentFY}.
          Onboard the matrix to start adding stakeholders for this {scopeUnit}.
        </p>
        <Button onClick={handleCreateEngagement} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Onboarding...
            </>
          ) : (
            'Onboard Stakeholder Matrix'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-sm text-muted-foreground min-w-0 flex-1'>
          Stakeholder engagement for {scopeName} · {currentFY}
        </p>
        <div className='flex items-center gap-1 shrink-0'>
          <Button
            type='button'
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size='icon'
            className='h-8 w-8'
            aria-pressed={viewMode === 'table'}
            aria-label='Table view'
            title='Table view'
            onClick={() => setViewMode('table')}
          >
            <Table2 className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
            size='icon'
            className='h-8 w-8'
            aria-pressed={viewMode === 'matrix'}
            aria-label='Matrix view'
            title='Matrix view'
            onClick={() => setViewMode('matrix')}
          >
            <LayoutGrid className='h-4 w-4' />
          </Button>
          <Button
            size='sm'
            onClick={() => {
              setEditingEntry(null)
              setEditingIndex(null)
              setAddDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4 mr-2' />
            Add Stakeholder
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <StakeholderEngagementTable
          stakeholders={stakeholders}
          engagementId={engagement._id}
          initiatives={initiatives}
          onEdit={handleEdit}
          onDelete={() => router.refresh()}
          onReport={handleReport}
          onActionPoints={handleActionPoints}
          onMinutes={handleMinutes}
        />
      ) : (
        <StakeholderMatrix stakeholders={stakeholders} onSelect={handleEdit} />
      )}

      <AddStakeholderDialog
        open={addDialogOpen}
        onOpenChange={open => {
          setAddDialogOpen(open)
          if (!open) {
            setEditingEntry(null)
            setEditingIndex(null)
          }
        }}
        engagementId={engagement._id}
        staffOptions={staffOptions}
        initiatives={initiatives}
        sprints={sprints}
        stakeholders={stakeholders}
        nextSn={stakeholders.length + 1}
        editingEntry={editingEntry}
        editingIndex={editingIndex ?? undefined}
        onSuccess={handleAddSuccess}
      />

      <AssignActionPointsDialog
        open={actionPointsDialogOpen}
        onOpenChange={open => {
          setActionPointsDialogOpen(open)
          if (!open) {
            setActionPointsEntry(null)
            setActionPointsIndex(null)
          }
        }}
        entry={actionPointsEntry}
        stakeholderIndex={actionPointsIndex}
        engagementId={engagement._id}
        staffOptions={staffOptions}
        onSuccess={() => router.refresh()}
      />

      <StakeholderMinutesDialog
        open={minutesDialogOpen}
        onOpenChange={open => {
          setMinutesDialogOpen(open)
          if (!open) {
            setMinutesEntry(null)
            setMinutesIndex(null)
          }
        }}
        entry={
          minutesIndex !== null
            ? (stakeholders[minutesIndex] ?? minutesEntry)
            : minutesEntry
        }
        stakeholderIndex={minutesIndex}
        engagementId={engagement._id}
        staffOptions={staffOptions}
        viewerStaffId={viewerStaffId}
        onSuccess={() => router.refresh()}
      />

      <SubmitReportDialog
        open={reportDialogOpen}
        onOpenChange={open => {
          setReportDialogOpen(open)
          if (!open) {
            setReportEntry(null)
            setReportIndex(null)
          }
        }}
        entry={reportEntry}
        stakeholderIndex={reportIndex}
        engagementId={engagement._id}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
