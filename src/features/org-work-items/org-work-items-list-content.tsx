'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { AllClearState } from '@/components/all-clear-state'
import { orgWorkItemStatusLabel } from '@/lib/org-work-item/workflow'
import { CommissionerBoardActionsTable } from '@/features/board-actions/commissioner-board-actions-table'
import type { CommissionerBoardActionRow } from '@/features/board-actions/load-commissioner-board-actions'
import type { SectionOrgWorkItemRow } from '@/features/org-work-items/load-section-org-work-item.server'

type OrgWorkItemsListContentProps =
  | {
      mode: 'commissioner'
      itemKind: 'board-actions' | 'audit-queries'
      title: string
      subtitle: string
      actions: CommissionerBoardActionRow[]
      divisions: { _id: string; name: string }[]
      basePath: string
      apiPath: string
      canCreate?: boolean
    }
  | {
      mode: 'section'
      itemKind: 'board-actions' | 'audit-queries'
      title: string
      subtitle: string
      items: SectionOrgWorkItemRow[]
      basePath: string
      roleLabel: string
      dashboardHref: string
    }

export function OrgWorkItemsListContent(props: OrgWorkItemsListContentProps) {
  if (props.mode === 'commissioner') {
    return <CommissionerList {...props} />
  }
  return <SectionList {...props} />
}

function CommissionerList({
  itemKind,
  title,
  subtitle,
  actions,
  divisions,
  basePath,
  apiPath,
  canCreate = true,
}: Extract<OrgWorkItemsListContentProps, { mode: 'commissioner' }>) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [formTitle, setFormTitle] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formDueDate, setFormDueDate] = React.useState('')
  const [formDivisionId, setFormDivisionId] = React.useState('')

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: 'Commissioner', href: '/commissioner/dashboard' },
        { label: title },
      ],
      [title],
    ),
  )

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDueDate) return
    setIsSaving(true)
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          dueDate: formDueDate,
          divisionId: formDivisionId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      toast.success('Created')
      setOpen(false)
      router.push(`${basePath}/${data.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setIsSaving(false)
    }
  }

  const itemLabel = itemKind === 'board-actions' ? 'board action' : 'audit query'

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-4 pt-6 md:p-8'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            New {itemLabel}
          </Button>
        ) : null}
      </div>

      <CommissionerBoardActionsTable
        data={actions}
        basePath={basePath}
        readOnly={!canCreate}
        emptyDescription={
          itemKind === 'board-actions'
            ? 'You have no board actions right now.'
            : 'You have no audit queries right now.'
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {itemLabel}</DialogTitle>
            <DialogDescription>
              Create and optionally cascade to a division.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>Description</Label>
              <textarea
                className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Due date</Label>
              <Input
                type='date'
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Cascade to division (optional)</Label>
              <Select value={formDivisionId} onValueChange={setFormDivisionId}>
                <SelectTrigger>
                  <SelectValue placeholder='Commissioner level' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>Commissioner level</SelectItem>
                  {divisions.map(d => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={isSaving || !formTitle.trim() || !formDueDate}
            >
              {isSaving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionList({
  itemKind,
  title,
  subtitle,
  items,
  basePath,
  roleLabel,
  dashboardHref,
}: Extract<OrgWorkItemsListContentProps, { mode: 'section' }>) {
  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: roleLabel, href: dashboardHref },
        { label: title },
      ],
      [dashboardHref, roleLabel, title],
    ),
  )

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-4 pt-6 md:p-8'>
      <div>
        <h1 className='text-2xl font-bold'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <AllClearState
          description={
            itemKind === 'board-actions'
              ? 'You have no board actions assigned to you right now.'
              : 'You have no audit queries assigned to you right now.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item._id}>
                <TableCell>
                  <Link
                    href={`${basePath}/${item._id}`}
                    className='font-medium hover:underline'
                  >
                    {item.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {item.dueDate
                    ? format(parseISO(item.dueDate), 'dd MMM yyyy')
                    : '—'}
                </TableCell>
                <TableCell>{orgWorkItemStatusLabel(item.status)}</TableCell>
                <TableCell>
                  {item.assigneeName || item.supervisorName || item.sectionName || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
