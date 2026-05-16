'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Loader2, RefreshCw, Filter } from 'lucide-react'

import type { AuditLogRow } from '@/lib/audit-log/types'
import { AUDIT_CHANGE_TYPES } from '@/lib/audit-log/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 50

export function AuditLogContent() {
  const [entries, setEntries] = React.useState<AuditLogRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [resourceTypes, setResourceTypes] = React.useState<
    { value: string; label: string }[]
  >([])
  const [offset, setOffset] = React.useState(0)
  const [resourceFilter, setResourceFilter] = React.useState<string>('all')
  const [changeFilter, setChangeFilter] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')
  const [searchInput, setSearchInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (resourceFilter !== 'all') params.set('resourceType', resourceFilter)
      if (changeFilter !== 'all') params.set('change', changeFilter)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/audit-log?${params}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        entries: AuditLogRow[]
        total: number
        resourceTypes: { value: string; label: string }[]
      }
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
      setResourceTypes(data.resourceTypes ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [offset, resourceFilter, changeFilter, search])

  React.useEffect(() => {
    load()
  }, [load])

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    setSearch(searchInput)
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-8'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Audit log</h1>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Filter className='h-4 w-4' />
          <span>
            {total} audit log {total === 1 ? 'entry' : 'entries'}
            {isLoading && ' · Updating…'}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <form onSubmit={applySearch} className='flex gap-2'>
            <Input
              placeholder='Search message, resource, author…'
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className='w-56'
            />
            <Button type='submit' variant='secondary' size='sm'>
              Search
            </Button>
          </form>
          <Select
            value={resourceFilter}
            onValueChange={v => {
              setOffset(0)
              setResourceFilter(v)
            }}
          >
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='Resource' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All resources</SelectItem>
              {resourceTypes.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={changeFilter}
            onValueChange={v => {
              setOffset(0)
              setChangeFilter(v)
            }}
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Change' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All changes</SelectItem>
              {Object.entries(AUDIT_CHANGE_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={() => load()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <div className='rounded-md border overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='whitespace-nowrap min-w-[180px]'>
                Timestamp
              </TableHead>
              <TableHead className='min-w-[120px]'>Author</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className='min-w-[200px]'>Message</TableHead>
              <TableHead className='min-w-[200px]'>New value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center py-8 text-muted-foreground'
                >
                  No audit entries match your filters.
                </TableCell>
              </TableRow>
            ) : (
              entries.map(row => (
                <TableRow key={row.id}>
                  <TableCell className='text-xs whitespace-nowrap font-mono'>
                    {format(new Date(row.timestamp), 'M/d/yyyy, h:mm:ss.SSS a')}
                  </TableCell>
                  <TableCell className='text-sm'>
                    <div className='font-medium'>{row.authorName}</div>
                    {row.authorEmail && (
                      <div className='text-xs text-muted-foreground truncate max-w-[140px]'>
                        {row.authorEmail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' className='font-mono text-[10px]'>
                      {row.change}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm font-medium'>
                      {resourceTypes.find(r => r.value === row.resourceType)
                        ?.label ?? row.resourceType}
                    </div>
                    <div className='text-xs text-muted-foreground truncate max-w-[160px]'>
                      {row.resourceLabel}
                    </div>
                  </TableCell>
                  <TableCell className='text-sm'>{row.message}</TableCell>
                  <TableCell className='text-xs font-mono text-muted-foreground max-w-[280px] truncate'>
                    {row.newValue ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <Button
            variant='outline'
            size='sm'
            disabled={offset === 0 || isLoading}
            onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <span className='text-sm text-muted-foreground'>
            Page {page} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={offset + PAGE_SIZE >= total || isLoading}
            onClick={() => setOffset(o => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}

      {isLoading && entries.length === 0 && (
        <div className='flex justify-center py-8'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      )}
    </div>
  )
}
