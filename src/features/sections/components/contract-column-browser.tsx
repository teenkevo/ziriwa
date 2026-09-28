'use client'

import * as React from 'react'
import {
  ChevronRight,
  File,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ContractColumnLeaf {
  id: string
  title: string
  code?: string
  subtitle?: string
  detail?: string
  status?: string
  onOpen?: () => void
  onDelete?: () => void
}

export interface ContractColumnInitiative {
  id: string
  title: string
  code?: string
  subtitle?: string
  onEdit?: () => void
  onDelete?: () => void
  /** Open the initiative page instead of a third column. */
  onOpen?: () => void
  /** When true, selecting this initiative reveals its children in the next column. */
  opensNextColumn?: boolean
  childHeaderAction?: React.ReactNode
  childEmptyLabel?: string
  children?: ContractColumnLeaf[]
}

export interface ContractColumnObjective {
  id: string
  title: string
  code?: string
  subtitle?: string
  onEdit?: () => void
  onDelete?: () => void
  onAddInitiative?: () => void
  initiatives: ContractColumnInitiative[]
}

interface ContractColumnBrowserProps {
  objectives: ContractColumnObjective[]
  onAddObjective?: () => void
}

interface ColumnRowModel {
  id: string
  title: string
  code?: string
  subtitle?: string
  detail?: string
  status?: string
  hasChildren?: boolean
  branchSelected?: boolean
  leafSelected?: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
  onOpen?: () => void
}

interface ColumnModel {
  id: string
  title: string
  emptyLabel: string
  headerAction?: React.ReactNode
  rows: ColumnRowModel[]
}

export function ContractColumnAddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='h-7 w-7 shrink-0'
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Plus className='h-4 w-4' />
    </Button>
  )
}

export function contractItemKindLabel(activityType: string | undefined): string {
  if (activityType === 'kpi' || activityType === 'core') return 'Core KPI'
  if (activityType === 'cross-cutting') return 'Cross-cutting'
  return 'Measurable activity'
}

function statusDotClass(status: string): string {
  if (status === 'completed' || status === 'done') return 'bg-emerald-500'
  if (
    status === 'in_progress' ||
    status === 'in_review' ||
    status === 'delivered'
  ) {
    return 'bg-amber-400'
  }
  return 'bg-muted-foreground/40'
}

function matchesQuery(query: string, row: ColumnRowModel): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [row.code, row.title, row.subtitle, row.detail].some(part =>
    part?.toLowerCase().includes(needle),
  )
}

function ColumnRowMenu({
  row,
}: {
  row: ColumnRowModel
}) {
  if (!row.onEdit && !row.onDelete && !row.onOpen) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className={cn(
            'h-7 w-7 shrink-0',
            row.leafSelected &&
              'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground',
          )}
          aria-label={`${row.title} options`}
          title='Options'
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <MoreVertical className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
      >
        {row.onOpen ? (
          <DropdownMenuItem
            onSelect={event => {
              event.preventDefault()
              row.onOpen?.()
            }}
          >
            <File className='mr-2 h-4 w-4' />
            Manage
          </DropdownMenuItem>
        ) : null}
        {row.onEdit ? (
          <DropdownMenuItem
            onSelect={event => {
              event.preventDefault()
              row.onEdit?.()
            }}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Edit
          </DropdownMenuItem>
        ) : null}
        {row.onDelete ? (
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onSelect={event => {
              event.preventDefault()
              row.onDelete?.()
            }}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColumnRow({ row }: { row: ColumnRowModel }) {
  return (
    <div
      role='option'
      aria-selected={Boolean(row.branchSelected || row.leafSelected)}
      className={cn(
        'flex w-full min-w-0 items-center rounded-md',
        row.leafSelected && 'bg-primary text-primary-foreground',
        row.branchSelected && 'bg-muted',
        !row.leafSelected && !row.branchSelected && 'hover:bg-muted/80',
      )}
    >
      <button
        type='button'
        onClick={row.onSelect}
        className='flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left'
        title={row.code ? `${row.code} ${row.title}` : row.title}
      >
        <span className='min-w-0 flex-1'>
          <span className='flex min-w-0 items-baseline gap-2'>
            {row.code ? (
              <span className='shrink-0 font-mono text-sm leading-5'>
                {row.code}
              </span>
            ) : null}
            <span className='truncate text-sm leading-5'>{row.title}</span>
          </span>
          {row.subtitle ? (
            <span
              className={cn(
                'block truncate text-xs leading-4',
                row.leafSelected
                  ? 'text-primary-foreground/75'
                  : 'text-muted-foreground',
              )}
            >
              {row.subtitle}
            </span>
          ) : null}
          {row.detail ? (
            <span
              className={cn(
                'mt-0.5 line-clamp-2 block text-xs leading-4',
                row.leafSelected
                  ? 'text-primary-foreground/75'
                  : 'text-muted-foreground',
              )}
            >
              {row.detail}
            </span>
          ) : null}
        </span>
        {row.status ? (
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              statusDotClass(row.status),
            )}
            aria-hidden
          />
        ) : null}
      </button>
      <ColumnRowMenu row={row} />
      {row.hasChildren ? (
        <ChevronRight
          className={cn(
            'mr-1 h-4 w-4 shrink-0',
            row.leafSelected
              ? 'text-primary-foreground/80'
              : 'text-muted-foreground',
          )}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

function ColumnPane({
  column,
  showSearch,
  query,
  onQueryChange,
}: {
  column: ColumnModel
  showSearch: boolean
  query: string
  onQueryChange: (value: string) => void
}) {
  const visibleRows = showSearch
    ? column.rows.filter(row => matchesQuery(query, row))
    : column.rows
  const emptyLabel =
    showSearch && query.trim() && column.rows.length > 0
      ? 'No matches.'
      : column.emptyLabel

  return (
    <section
      aria-label={column.title}
      className='flex h-full min-w-0 flex-1 flex-col border-r border-border last:border-r-0'
    >
      <header className='flex h-12 shrink-0 items-center gap-2 px-3'>
        <h3 className='min-w-0 flex-1 truncate text-sm font-medium text-primary'>
          {column.title}
        </h3>
        {column.headerAction}
      </header>
      {showSearch ? (
        <div className='shrink-0 px-3 pb-2'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              placeholder='Search list'
              aria-label={`Search ${column.title}`}
              autoComplete='off'
              className='h-8 border-transparent bg-muted/40 pl-8 shadow-none focus-visible:ring-1'
            />
          </div>
        </div>
      ) : null}
      <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden'>
        <div role='listbox' aria-label={column.title} className='space-y-0.5 px-2 py-1.5'>
          {visibleRows.length === 0 ? (
            <p className='px-2 py-8 text-center text-xs text-muted-foreground'>
              {emptyLabel}
            </p>
          ) : (
            visibleRows.map(row => <ColumnRow key={row.id} row={row} />)
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Finder-style columns for a contract: objectives, then initiatives, then
 * measurable activities or detailed tasks.
 */
export function ContractColumnBrowser({
  objectives,
  onAddObjective,
}: ContractColumnBrowserProps) {
  const [selectedObjectiveId, setSelectedObjectiveId] = React.useState<
    string | null
  >(null)
  const [selectedInitiativeId, setSelectedInitiativeId] = React.useState<
    string | null
  >(null)
  const [selectedLeafId, setSelectedLeafId] = React.useState<string | null>(
    null,
  )
  const [queries, setQueries] = React.useState({
    objectives: '',
    initiatives: '',
    activities: '',
  })

  const selectedObjective =
    objectives.find(objective => objective.id === selectedObjectiveId) ?? null
  const selectedInitiative =
    selectedObjective?.initiatives.find(
      initiative => initiative.id === selectedInitiativeId,
    ) ?? null

  const columns = React.useMemo<ColumnModel[]>(() => {
    const objectiveColumn: ColumnModel = {
      id: 'objectives',
      title: 'SSMARTA objectives',
      emptyLabel: 'No SSMARTA objectives yet.',
      headerAction: onAddObjective ? (
        <ContractColumnAddButton
          label='Add SSMARTA objective'
          onClick={onAddObjective}
        />
      ) : undefined,
      rows: objectives.map(objective => ({
        id: objective.id,
        title: objective.title,
        code: objective.code,
        subtitle: objective.subtitle,
        hasChildren: true,
        branchSelected: objective.id === selectedObjective?.id,
        onSelect: () => {
          if (selectedObjective?.id !== objective.id) {
            setSelectedInitiativeId(null)
            setSelectedLeafId(null)
          }
          setSelectedObjectiveId(objective.id)
        },
        onEdit: objective.onEdit,
        onDelete: objective.onDelete,
      })),
    }

    const initiativeColumn: ColumnModel = selectedObjective
      ? {
      id: `initiatives-${selectedObjective.id}`,
      title: 'Initiatives',
      emptyLabel: 'No initiatives yet.',
      headerAction: selectedObjective.onAddInitiative ? (
        <ContractColumnAddButton
          label='Add initiative'
          onClick={selectedObjective.onAddInitiative}
        />
      ) : undefined,
      rows: selectedObjective.initiatives.map(initiative => {
        const opensColumn = initiative.opensNextColumn === true
        return {
          id: initiative.id,
          title: initiative.title,
          code: initiative.code,
          subtitle: initiative.subtitle,
          hasChildren: opensColumn,
          branchSelected:
            opensColumn && initiative.id === selectedInitiative?.id,
          leafSelected:
            !opensColumn && initiative.id === selectedInitiative?.id,
          onSelect: () => {
            if (opensColumn) {
              if (selectedInitiative?.id !== initiative.id) {
                setSelectedLeafId(null)
              }
              setSelectedInitiativeId(initiative.id)
              return
            }
            setSelectedInitiativeId(initiative.id)
            initiative.onOpen?.()
          },
          onEdit: initiative.onEdit,
          onDelete: initiative.onDelete,
          onOpen: opensColumn ? undefined : initiative.onOpen,
        }
      }),
    }
      : {
          id: 'initiatives',
          title: 'Initiatives',
          emptyLabel: 'Select a SSMARTA objective.',
          rows: [],
        }

    const activityColumn: ColumnModel =
      selectedInitiative?.opensNextColumn
        ? {
      id: `children-${selectedInitiative.id}`,
      title: 'Measurable activities',
      emptyLabel:
        selectedInitiative.childEmptyLabel ?? 'No measurable activities yet.',
      headerAction: selectedInitiative.childHeaderAction,
      rows: (selectedInitiative.children ?? []).map(leaf => ({
        id: leaf.id,
        title: leaf.title,
        code: leaf.code,
        subtitle: leaf.subtitle,
        detail: leaf.detail,
        status: leaf.status,
        leafSelected: leaf.id === selectedLeafId,
        onSelect: () => {
          setSelectedLeafId(leaf.id)
          leaf.onOpen?.()
        },
        onDelete: leaf.onDelete,
        onOpen: leaf.onOpen,
      })),
    }
        : {
            id: 'activities',
            title: 'Measurable activities',
            emptyLabel: 'Select an initiative.',
            rows: [],
          }

    return [objectiveColumn, initiativeColumn, activityColumn]
  }, [
    objectives,
    onAddObjective,
    selectedObjective,
    selectedInitiative,
    selectedLeafId,
  ])

  React.useEffect(() => {
    setQueries(current => ({
      ...current,
      initiatives: '',
      activities: '',
    }))
  }, [selectedObjectiveId])

  React.useEffect(() => {
    setQueries(current => ({ ...current, activities: '' }))
  }, [selectedInitiativeId])

  function queryKey(columnId: string): keyof typeof queries {
    if (columnId.startsWith('initiatives')) return 'initiatives'
    if (columnId.startsWith('children') || columnId === 'activities') {
      return 'activities'
    }
    return 'objectives'
  }

  return (
    <div className='flex h-[32rem] max-h-[calc(100vh-12rem)] overflow-hidden rounded-lg border bg-background'>
      {columns.map(column => {
        const key = queryKey(column.id)
        const hasList =
          key === 'objectives' ||
          (key === 'initiatives' && selectedObjective != null) ||
          (key === 'activities' && selectedInitiative?.opensNextColumn === true)
        return (
          <ColumnPane
            key={column.id}
            column={column}
            showSearch={hasList}
            query={queries[key]}
            onQueryChange={value =>
              setQueries(current => ({ ...current, [key]: value }))
            }
          />
        )
      })}
    </div>
  )
}
