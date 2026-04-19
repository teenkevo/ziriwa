'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Table2, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AddStakeholderDialog } from './components/add-stakeholder-dialog'
import { StakeholderEngagementTable } from './components/stakeholder-engagement-table'
import { StakeholderMatrix } from './components/stakeholder-matrix'
import { SubmitReportDialog } from './components/submit-report-dialog'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import type {
  StakeholderEngagement,
  StakeholderEntry,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type StaffOption = { _id: string; fullName?: string; staffId?: string }
type InitiativeOption = { code: string; title: string }

interface StakeholderEngagementContentProps {
  sectionId: string
  sectionName: string
  engagement: StakeholderEngagement | null
  staffOptions: StaffOption[]
  initiatives?: InitiativeOption[]
}

export function StakeholderEngagementContent({
  sectionId,
  sectionName,
  engagement,
  staffOptions,
  initiatives = [],
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
  const [isCreating, setIsCreating] = React.useState(false)

  const stakeholders = engagement?.stakeholders ?? []
  const currentFY =
    engagement?.financialYearLabel ?? getCurrentFinancialYear().label

  const handleCreateEngagement = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/stakeholder-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId }),
      })
      // TODO: Map Engagements to Auto Reporting
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create engagement')
      }
      await router.refresh()
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

  const handleAddSuccess = async () => {
    setEditingEntry(null)
    setEditingIndex(null)
    await router.refresh()
  }

  const handleReport = (entry: StakeholderEntry, index: number) => {
    setReportEntry(entry)
    setReportIndex(index)
    setReportDialogOpen(true)
  }

  if (!engagement) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground mb-4'>
            No stakeholder engagement matrix for {currentFY}. Create one to
            start adding stakeholders.
          </p>
          <Button onClick={handleCreateEngagement} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Creating...
              </>
            ) : (
              'Create Stakeholder Engagement'
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-sm text-muted-foreground min-w-0 flex-1'>
          Stakeholder engagement matrix for {currentFY}
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
          onDelete={async () => {
            await router.refresh()
          }}
          onReport={handleReport}
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
        nextSn={stakeholders.length + 1}
        editingEntry={editingEntry}
        editingIndex={editingIndex ?? undefined}
        onSuccess={handleAddSuccess}
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
        onSuccess={async () => {
          await router.refresh()
        }}
      />
    </div>
  )
}
