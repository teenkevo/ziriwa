'use client'

import * as React from 'react'
import Link from 'next/link'
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
  /** Navigates away from the column view. */
  href?: string
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/** Initiative page where evidence for a measurable activity is submitted. */
export function contractInitiativeActivityHref(input: {
  sectionSlug?: string
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityKey?: string
}): string | undefined {
  const { sectionSlug, contractId, objectiveIndex, initiativeIndex, activityKey } =
    input
  if (!sectionSlug) return undefined
  const query = activityKey
    ? `?activityKey=${encodeURIComponent(activityKey)}`
    : ''
  return `/sections/${sectionSlug}/initiative/${contractId}/${objectiveIndex}/${initiativeIndex}${query}`
}

/** Detailed-task page for an officer contract row. */
export function contractDetailedTaskHref(input: {
  sectionSlug?: string
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  taskKey: string
}): string | undefined {
  const {
    sectionSlug,
    contractId,
    objectiveIndex,
    initiativeIndex,
    activityIndex,
    taskKey,
  } = input
  if (!sectionSlug) return undefined
  return `/sections/${sectionSlug}/activity/${contractId}/${objectiveIndex}/${initiativeIndex}/${activityIndex}?taskKey=${encodeURIComponent(taskKey)}`
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
  /** Shown in the empty SSMARTA objectives column when objectives are cascaded in. */
  emptyObjectivesMessage?: string
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
  href?: string
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
  emptyAction?: React.ReactNode
  rows: ColumnRowModel[]
}

type ColumnIllustrationKind = 'objectives' | 'initiatives' | 'activities' | 'tasks'

function ColumnIllustration({ kind }: { kind: ColumnIllustrationKind }) {
  const frame = 'h-24 w-[8.2rem]'

  if (kind === 'objectives') {
    return (
      <svg viewBox='0 0 120 88' className={frame} aria-hidden>
        <ellipse cx='60' cy='78' rx='28' ry='3' className='fill-foreground/10' />
        <circle cx='60' cy='40' r='30' className='fill-foreground/10' />
        <circle cx='60' cy='40' r='20' className='fill-foreground/22' />
        <circle cx='60' cy='40' r='10' className='fill-foreground/45' />
        <circle cx='60' cy='40' r='4' className='fill-foreground/80' />
      </svg>
    )
  }

  if (kind === 'initiatives') {
    return (
      <svg viewBox='0 0 120 88' className={frame} aria-hidden>
        <ellipse cx='60' cy='82' rx='36' ry='3' className='fill-foreground/10' />
        <rect x='42' y='6' width='36' height='16' rx='5' className='fill-foreground/45' />
        <path
          d='M60 22v10M60 32H28v8M60 32h32v8'
          fill='none'
          className='stroke-foreground/40'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <rect x='10' y='40' width='36' height='28' rx='6' className='fill-foreground/18' />
        <rect x='74' y='40' width='36' height='28' rx='6' className='fill-foreground/30' />
      </svg>
    )
  }

  if (kind === 'tasks') {
    return (
      <svg viewBox='0 0 120 88' className={frame} aria-hidden>
        <ellipse cx='60' cy='82' rx='30' ry='3' className='fill-foreground/10' />
        <rect x='36' y='8' width='48' height='8' rx='3' className='fill-foreground/45' />
        <rect x='28' y='14' width='64' height='58' rx='8' className='fill-foreground/12' />
        <rect x='38' y='28' width='44' height='6' rx='3' className='fill-foreground/35' />
        <rect x='38' y='40' width='36' height='6' rx='3' className='fill-foreground/25' />
        <rect x='38' y='52' width='28' height='6' rx='3' className='fill-foreground/18' />
      </svg>
    )
  }

  return (
    <svg viewBox='0 0 120 88' className={frame} aria-hidden>
      <ellipse cx='60' cy='82' rx='32' ry='3' className='fill-foreground/10' />
      <rect x='30' y='8' width='60' height='66' rx='10' className='fill-foreground/12' />
      <rect x='40' y='20' width='12' height='12' rx='3' className='fill-foreground/55' />
      <path
        d='M43 26.2 45.4 28.6 49.6 24'
        fill='none'
        className='stroke-background'
        strokeWidth='1.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <rect x='58' y='24' width='22' height='4' rx='2' className='fill-foreground/40' />
      <rect x='40' y='38' width='12' height='12' rx='3' className='fill-foreground/28' />
      <rect x='58' y='42' width='18' height='4' rx='2' className='fill-foreground/28' />
      <rect x='40' y='56' width='12' height='12' rx='3' className='fill-foreground/18' />
      <rect x='58' y='60' width='14' height='4' rx='2' className='fill-foreground/20' />
    </svg>
  )
}

function ColumnEmptyPlaceholder({
  title,
  message,
  illustration,
}: {
  title: string
  message?: string
  illustration: ColumnIllustrationKind
}) {
  return (
    <div
      role='status'
      aria-label={message ? `${title}. ${message}` : title}
      className='flex w-full max-w-full flex-col items-center gap-4 px-1 text-center'
    >
      <ColumnIllustration kind={illustration} />
      <div className='space-y-1'>
        <p className='text-balance text-lg font-semibold tracking-tight text-foreground'>
          {title}
        </p>
        {message ? (
          <p className='text-balance text-xs leading-relaxed text-muted-foreground'>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ObjectivesWaitingPlaceholder({ message }: { message: string }) {
  return (
    <ColumnEmptyPlaceholder
      title='No SSMARTA objectives yet'
      message={message}
      illustration='objectives'
    />
  )
}

function placeholderCopy(
  emptyLabel: string,
): { title: string; message: string; illustration: ColumnIllustrationKind } | null {
  if (emptyLabel === 'Select a SSMARTA objective.') {
    return {
      title: 'No initiatives yet',
      message: 'Select a SSMARTA objective to see its initiatives.',
      illustration: 'initiatives',
    }
  }
  if (emptyLabel === 'No initiatives yet.') {
    return {
      title: 'No initiatives yet',
      message: 'Initiatives for this objective will show up here.',
      illustration: 'initiatives',
    }
  }
  if (emptyLabel === 'Select an initiative.') {
    return {
      title: 'No measurable activities yet',
      message: 'Select an initiative to see its measurable activities.',
      illustration: 'activities',
    }
  }
  if (emptyLabel === 'No measurable activities yet.') {
    return {
      title: 'No measurable activities yet',
      message: 'Measurable activities for this initiative will show up here.',
      illustration: 'activities',
    }
  }
  if (emptyLabel === 'No detailed tasks yet.') {
    return {
      title: 'No detailed tasks yet',
      message: 'Detailed tasks for this initiative will show up here.',
      illustration: 'tasks',
    }
  }
  return null
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
      variant='default'
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

function matchesQuery(query: string, row: ColumnRowModel): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [row.code, row.title, row.subtitle, row.detail].some(part =>
    part?.toLowerCase().includes(needle),
  )
}

function runAfterMenuCloses(action: (() => void) | undefined) {
  if (!action) return
  window.setTimeout(action, 0)
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
          className='h-5 w-5 shrink-0'
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
          <DropdownMenuItem onSelect={() => runAfterMenuCloses(row.onOpen)}>
            <File className='mr-2 h-4 w-4' />
            Manage
          </DropdownMenuItem>
        ) : null}
        {row.onEdit ? (
          <DropdownMenuItem onSelect={() => runAfterMenuCloses(row.onEdit)}>
            <Pencil className='mr-2 h-4 w-4' />
            Edit
          </DropdownMenuItem>
        ) : null}
        {row.onDelete ? (
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onSelect={() => runAfterMenuCloses(row.onDelete)}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColumnRowActivator({
  row,
  children,
}: {
  row: ColumnRowModel
  children: React.ReactNode
}) {
  const className = 'flex min-w-0 flex-1 items-start gap-2 px-2 py-1.5 text-left'
  const title = row.code ? `${row.code} ${row.title}` : row.title

  if (row.href) {
    return (
      <Link href={row.href} className={className} title={title}>
        {children}
      </Link>
    )
  }

  return (
    <button type='button' onClick={row.onSelect} className={className} title={title}>
      {children}
    </button>
  )
}

function ColumnRow({ row }: { row: ColumnRowModel }) {
  return (
    <div
      role='option'
      aria-selected={Boolean(row.branchSelected || row.leafSelected)}
      className={cn(
        'flex w-full min-w-0 items-start rounded-md',
        (row.leafSelected || row.branchSelected) && 'bg-muted',
        !row.leafSelected && !row.branchSelected && 'hover:bg-muted/80',
      )}
    >
      <ColumnRowActivator row={row}>
        <span className='min-w-0 flex-1'>
          <span
            className={cn(
              'grid text-sm leading-5',
              row.code && 'grid-cols-[auto_minmax(0,1fr)] gap-x-2',
            )}
          >
            {row.code ? (
              <span className='whitespace-nowrap text-muted-foreground'>{row.code}</span>
            ) : null}
            <span className='min-w-0'>{row.title}</span>
          </span>
          {row.subtitle ? (
            <span
              className='block whitespace-normal break-words text-xs leading-4 text-muted-foreground'
            >
              {row.subtitle}
            </span>
          ) : null}
          {row.detail ? (
            <span
              className='mt-0.5 block whitespace-normal break-words text-xs leading-4 text-muted-foreground'
            >
              {row.detail}
            </span>
          ) : null}
        </span>
      </ColumnRowActivator>
      <div className='shrink-0 pt-1.5'>
        <div className='flex h-5 items-center'>
          <ColumnRowMenu row={row} />
          {row.hasChildren ? (
            <ChevronRight
            className='mr-1 h-4 w-4 shrink-0 text-muted-foreground'
              aria-hidden
            />
          ) : null}
        </div>
      </div>
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
  const showEmptyAction = visibleRows.length === 0 && column.emptyAction != null
  const emptyCopy =
    visibleRows.length === 0 && !showEmptyAction
      ? placeholderCopy(emptyLabel)
      : null

  return (
    <section
      aria-label={column.title}
      className='flex h-full min-w-0 flex-1 flex-col border-r border-border last:border-r-0'
    >
      <header className='flex h-12 shrink-0 items-center gap-2 px-3'>
        <h3 className='min-w-0 flex-1 truncate text-base font-semibold text-primary'>
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
              placeholder={`Search ${column.title}`}
              aria-label={`Search ${column.title}`}
              autoComplete='off'
              className='h-8 border-transparent bg-muted/40 pl-8 shadow-none focus-visible:ring-1'
            />
          </div>
        </div>
      ) : null}
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden'>
        {visibleRows.length === 0 ? (
          <div className='flex min-h-full w-full items-center justify-center px-3 py-6'>
            {showEmptyAction ? (
              column.emptyAction
            ) : emptyCopy ? (
              <ColumnEmptyPlaceholder
                title={emptyCopy.title}
                message={emptyCopy.message}
                illustration={emptyCopy.illustration}
              />
            ) : (
              <p className='px-2 text-center text-xs text-muted-foreground'>
                {emptyLabel}
              </p>
            )}
          </div>
        ) : (
          <div role='listbox' aria-label={column.title} className='space-y-0.5 px-2 py-1.5'>
            {visibleRows.map(row => (
              <ColumnRow key={row.id} row={row} />
            ))}
          </div>
        )}
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
  emptyObjectivesMessage,
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
      headerAction:
        onAddObjective && objectives.length > 0 ? (
          <ContractColumnAddButton
            label='Add SSMARTA objective'
            onClick={onAddObjective}
          />
        ) : undefined,
      emptyAction:
        objectives.length > 0
          ? undefined
          : onAddObjective
            ? (
                <Button
                  type='button'
                  className='h-auto max-w-full whitespace-normal px-3 py-2 text-center'
                  onClick={onAddObjective}
                >
                  <Plus className='h-4 w-4' />
                  Add SSMARTA objective
                </Button>
              )
            : emptyObjectivesMessage
              ? (
                  <ObjectivesWaitingPlaceholder
                    message={emptyObjectivesMessage}
                  />
                )
              : undefined,
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
        href: leaf.href,
        leafSelected: !leaf.href && leaf.id === selectedLeafId,
        onSelect: () => {
          if (leaf.href) return
          setSelectedLeafId(leaf.id)
          leaf.onOpen?.()
        },
        onDelete: leaf.onDelete,
        onEdit: leaf.onEdit,
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
    emptyObjectivesMessage,
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
          (key === 'objectives' && column.rows.length > 0) ||
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
