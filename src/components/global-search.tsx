'use client'

import * as React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Building2, Layers, Loader2, Search, UserCircle } from 'lucide-react'
import type { GlobalSearchResponse } from '@/app/api/search/route'

const ROLE_LABEL: Record<string, string> = {
  commissioner_general: 'Commissioner General',
  commissioner: 'Commissioner',
  assistant_commissioner: 'Assistant Commissioner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  officer: 'Officer',
}

function personHref(
  p: GlobalSearchResponse['people'][number],
): string | null {
  const s = p.section?.slug?.current
  if (s) return `/sections/${s}`
  const d = p.division?.slug?.current
  if (d) return `/divisions/${d}`
  const dept = p.department?.slug?.current
  if (dept) return `/departments/${dept}`
  return null
}

function personSubtitle(p: GlobalSearchResponse['people'][number]): string {
  const bits: string[] = []
  if (p.role) bits.push(ROLE_LABEL[p.role] ?? p.role)
  if (p.section?.name) bits.push(p.section.name)
  return bits.join(' · ') || 'Staff'
}

export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<GlobalSearchResponse | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const trimmed = query.trim()
  const activeSearch = trimmed.length >= 2

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const shortcutLabel = isMac ? 'Cmd + K' : 'Ctrl + K'

  React.useEffect(() => {
    if (!activeSearch) {
      setData(null)
      setLoading(false)
      return
    }

    const t = window.setTimeout(() => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      setData(null)
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ac.signal })
        .then(res => {
          if (!res.ok) throw new Error('Search failed')
          return res.json() as Promise<GlobalSearchResponse>
        })
        .then(json => {
          if (!ac.signal.aborted) setData(json)
        })
        .catch(err => {
          if (err?.name !== 'AbortError') console.error(err)
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, 280)

    return () => window.clearTimeout(t)
  }, [trimmed, activeSearch])

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hotkeyPressed = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'k'
      if (hotkeyPressed) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const hasResults =
    data &&
    (data.departments.length > 0 ||
      data.divisions.length > 0 ||
      data.sections.length > 0 ||
      data.people.length > 0)

  const showPanel = open && activeSearch

  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {open && (
        <div
          className='fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]'
          aria-hidden
          onMouseDown={() => setOpen(false)}
        />
      )}
      <div
        ref={rootRef}
        className={cn('relative min-w-0', open && 'z-50', className)}
      >
      <div
        className={cn(
          'relative flex items-center rounded-md border border-input bg-background shadow-sm transition-[box-shadow]',
          open && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
      >
        <Search
          className='pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground'
          aria-hidden
        />
        {loading && (
          <Loader2 className='absolute right-2.5 h-4 w-4 animate-spin text-muted-foreground' />
        )}
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={`Search Content (${shortcutLabel})`}
          className='h-9 border-0 bg-transparent pl-9 pr-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
          aria-autocomplete='list'
          aria-expanded={showPanel}
          autoComplete='off'
        />
      </div>
      <p className='sr-only'>
        Press {shortcutLabel} to focus search. Type at least two characters.
      </p>

      {showPanel && (
        <div
          className='absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95'
          role='listbox'
        >
          {loading && (
            <div className='flex items-center gap-2 px-3 py-8 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
              Searching…
            </div>
          )}

          {!loading && data && !hasResults && (
            <p className='px-3 py-6 text-center text-sm text-muted-foreground'>
              No results for &quot;{trimmed}&quot;.
            </p>
          )}

          {!loading && data && hasResults && (
            <ScrollArea className='max-h-[min(70vh,420px)]'>
              <div className='p-2'>
                {data.departments.length > 0 && (
                  <div className='mb-2'>
                    <p className='px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                      Departments
                    </p>
                    <ul className='space-y-0.5'>
                      {data.departments.map(d => (
                        <li key={d._id}>
                          <Link
                            href={`/departments/${d.slug?.current ?? d._id}`}
                            className='flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent'
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setOpen(false)
                              setQuery('')
                            }}
                          >
                            <Building2 className='h-4 w-4 shrink-0 text-muted-foreground' />
                            <span className='truncate font-medium'>
                              {d.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.divisions.length > 0 && (
                  <div className='mb-2'>
                    <p className='px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                      Divisions
                    </p>
                    <ul className='space-y-0.5'>
                      {data.divisions.map(d => (
                        <li key={d._id}>
                          <Link
                            href={`/divisions/${d.slug?.current ?? d._id}`}
                            className='flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent'
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setOpen(false)
                              setQuery('')
                            }}
                          >
                            <Building2 className='h-4 w-4 shrink-0 text-muted-foreground' />
                            <span className='truncate font-medium'>
                              {d.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.sections.length > 0 && (
                  <div className='mb-2'>
                    <p className='px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                      Sections
                    </p>
                    <ul className='space-y-0.5'>
                      {data.sections.map(s => (
                        <li key={s._id}>
                          <Link
                            href={`/sections/${s.slug?.current ?? s._id}`}
                            className='flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent'
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setOpen(false)
                              setQuery('')
                            }}
                          >
                            <Layers className='h-4 w-4 shrink-0 text-muted-foreground' />
                            <span className='truncate font-medium'>
                              {s.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.people.length > 0 && (
                  <div>
                    <p className='px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                      People
                    </p>
                    <ul className='space-y-0.5'>
                      {data.people.map(p => {
                        const href = personHref(p)
                        const inner = (
                          <>
                            <UserCircle className='h-4 w-4 shrink-0 text-muted-foreground' />
                            <span className='min-w-0 flex-1'>
                              <span className='block truncate font-medium'>
                                {p.title}
                              </span>
                              <span className='block truncate text-xs text-muted-foreground'>
                                {personSubtitle(p)}
                                {p.staffId
                                  ? ` · ${p.staffId}`
                                  : ''}
                              </span>
                            </span>
                          </>
                        )
                        return (
                          <li key={p._id}>
                            {href ? (
                              <Link
                                href={href}
                                className='flex items-start gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent'
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setOpen(false)
                                  setQuery('')
                                }}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className='flex items-start gap-2 rounded-sm px-2 py-2 text-sm text-muted-foreground'>
                                {inner}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
      </div>
    </>
  )
}
