'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import type { CommissionerStakeholderRow } from './load-commissioner-stakeholder-engagements'
import {
  ViewStakeholderReportDialog,
  hasSubmittedEngagementReport,
} from './view-stakeholder-report-dialog'

const STAKEHOLDER_LABELS: Record<string, string> = {
  regulatory_body: 'Regulatory body',
  community_leader: 'Community leader',
  supplier: 'Supplier',
  partner_organization: 'Partner organization',
  internal: 'Internal',
  other: 'Other',
}

const MODE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  email: 'Email',
  report: 'Report',
  workshop: 'Workshop',
  phone_call: 'Phone call',
  site_visit: 'Site visit',
  other: 'Other',
}

function stakeholderSearchHaystack(row: CommissionerStakeholderRow): string {
  return [
    row.name,
    row.designation,
    row.sectionName,
    row.divisionName,
    row.initiativeCode,
    STAKEHOLDER_LABELS[row.stakeholder ?? ''] ?? row.stakeholder,
    row.engagementReport,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

interface CommissionerStakeholderEngagementsTableProps {
  rows: CommissionerStakeholderRow[]
  financialYearLabel?: string
  showDivisionColumn?: boolean
  showDivisionFilter?: boolean
}

export function CommissionerStakeholderEngagementsTable({
  rows,
  financialYearLabel,
  showDivisionColumn = true,
  showDivisionFilter = true,
}: CommissionerStakeholderEngagementsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [viewRow, setViewRow] =
    React.useState<CommissionerStakeholderRow | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false)

  const handleViewReport = React.useCallback((row: CommissionerStakeholderRow) => {
    if (!hasSubmittedEngagementReport(row.engagementReport)) {
      toast('No report submitted yet')
      return
    }
    setViewRow(row)
    setReportDialogOpen(true)
  }, [])

  const divisionOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      map.set(row.divisionId, row.divisionName)
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const sectionOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      map.set(row.sectionId, row.sectionName)
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const divisionColumn = React.useMemo<ColumnDef<CommissionerStakeholderRow>>(
    () => ({
      id: 'divisionId',
      accessorFn: row => row.divisionId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Division' />
      ),
      cell: ({ row }) => (
        <span className='whitespace-nowrap'>{row.original.divisionName}</span>
      ),
      filterFn: (row, id, value) =>
        (value as string[]).includes(row.getValue(id) as string),
    }),
    [],
  )

  const columns = React.useMemo<ColumnDef<CommissionerStakeholderRow>[]>(
    () => [
      {
        accessorKey: 'sn',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='SN' />
        ),
        cell: ({ row }) => row.original.sn ?? row.index + 1,
        size: 48,
      },
      ...(showDivisionColumn ? [divisionColumn] : []),
      {
        id: 'sectionId',
        accessorFn: row => row.sectionId,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Section' />
        ),
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>{row.original.sectionName}</span>
        ),
        filterFn: (row, id, value) =>
          (value as string[]).includes(row.getValue(id) as string),
      },
      {
        accessorKey: 'stakeholder',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Stakeholder' />
        ),
        cell: ({ row }) =>
          STAKEHOLDER_LABELS[row.original.stakeholder ?? ''] ??
          row.original.stakeholder ??
          '—',
      },
      {
        accessorKey: 'designation',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Designation' />
        ),
        cell: ({ row }) => row.original.designation ?? '—',
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
        filterFn: (row, _id, value) => {
          const search = String(value ?? '')
            .trim()
            .toLowerCase()
          if (!search) return true
          return stakeholderSearchHaystack(row.original).includes(search)
        },
      },
      {
        accessorKey: 'initiativeCode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Linked Initiative' />
        ),
        cell: ({ row }) => row.original.initiativeCode ?? '—',
      },
      {
        accessorKey: 'proposedDateOfEngagement',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Proposed Date' />
        ),
        cell: ({ row }) =>
          row.original.proposedDateOfEngagement
            ? new Date(
                row.original.proposedDateOfEngagement,
              ).toLocaleDateString()
            : '—',
      },
      {
        accessorKey: 'modeOfEngagement',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Mode' />
        ),
        cell: ({ row }) =>
          MODE_LABELS[row.original.modeOfEngagement ?? ''] ??
          row.original.modeOfEngagement ??
          '—',
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Report</span>,
        cell: ({ row }) => {
          const entry = row.original
          return (
            <div className='text-right'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => handleViewReport(entry)}
                aria-label={`View engagement report for ${entry.name}`}
              >
                <Image
                  src='/pdf.png'
                  alt=''
                  width={20}
                  height={20}
                  className='h-5 w-5 object-contain'
                />
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [handleViewReport, showDivisionColumn, divisionColumn],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  })

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative flex-1 sm:max-w-[280px]'>
            <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search stakeholders'
              value={
                (table.getColumn('name')?.getFilterValue() as string) ?? ''
              }
              onChange={e =>
                table.getColumn('name')?.setFilterValue(e.target.value)
              }
              className='h-9 pl-8'
            />
          </div>
          {showDivisionFilter &&
            table.getColumn('divisionId') &&
            divisionOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn('divisionId')}
                title='Filter by Division'
                options={divisionOptions}
              />
            )}
          {table.getColumn('sectionId') && sectionOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn('sectionId')}
              title='Filter by Section'
              options={sectionOptions}
            />
          )}
          {isFiltered && (
            <Button
              variant='ghost'
              onClick={() => table.resetColumnFilters()}
              className='h-8 px-2 lg:px-3'
            >
              Reset
              <X className='ml-2 h-4 w-4' />
            </Button>
          )}
        </div>

        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.original.rowId}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='py-8 text-center text-muted-foreground'
                  >
                    {rows.length === 0
                      ? `No stakeholder engagements recorded${financialYearLabel ? ` for ${financialYearLabel}` : ''}. Entries are created in each section's workspace.`
                      : 'No stakeholders match your filters.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {table.getPageCount() > 1 && (
          <div className='flex items-center justify-between gap-4 px-2'>
            <p className='text-sm text-muted-foreground'>
              {table.getFilteredRowModel().rows.length} stakeholder
              {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
            </p>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1 text-sm'>
                <span className='text-muted-foreground'>Rows per page</span>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={value => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className='h-8 w-[70px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side='top'>
                    {[10, 15, 25, 50].map(size => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className='text-sm text-muted-foreground'>
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </span>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ViewStakeholderReportDialog
        open={reportDialogOpen}
        onOpenChange={open => {
          setReportDialogOpen(open)
          if (!open) setViewRow(null)
        }}
        stakeholderName={viewRow?.name ?? ''}
        designation={viewRow?.designation}
        sectionName={viewRow?.sectionName}
        divisionName={viewRow?.divisionName}
        reportHtml={viewRow?.engagementReport}
        attendanceSheet={viewRow?.attendanceSheet}
      />
    </>
  )
}
