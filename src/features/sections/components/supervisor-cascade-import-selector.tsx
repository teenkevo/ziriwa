'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type {
  CascadeImportSelection,
  ManagerCascadeOptionsResponse,
} from '@/lib/contract-cascade/types'

interface SupervisorCascadeImportSelectorProps {
  sectionId: string
  supervisorContractId?: string
  supervisorId?: string
  disabled?: boolean
  /** Called when selection or blocked-KPI state changes */
  onSelectionChange: (payload: {
    selections: CascadeImportSelection[]
    hasBlockedSelected: boolean
    importableCount: number
  }) => void
}

const CASCADE_OPTIONS_STALE_MS = 30_000
const cascadeOptionsCache = new Map<
  string,
  { data: ManagerCascadeOptionsResponse; cachedAt: number }
>()

function buildCacheKey(params: {
  sectionId: string
  supervisorContractId?: string
  supervisorId?: string
}) {
  return [
    params.sectionId,
    params.supervisorContractId ?? '',
    params.supervisorId ?? '',
  ].join('::')
}

export function invalidateSupervisorCascadeOptionsCache(params: {
  sectionId: string
  supervisorContractId?: string
  supervisorId?: string
}) {
  cascadeOptionsCache.delete(buildCacheKey(params))
}

function buildSelections(
  options: ManagerCascadeOptionsResponse,
  selectedActivityKeys: Set<string>,
): CascadeImportSelection[] {
  const byInitiative = new Map<string, string[]>()
  for (const obj of options.objectives) {
    for (const init of obj.initiatives) {
      for (const kpi of init.kpis) {
        if (!selectedActivityKeys.has(kpi.activityKey)) continue
        const list = byInitiative.get(init.initiativeKey) ?? []
        list.push(kpi.activityKey)
        byInitiative.set(init.initiativeKey, list)
      }
    }
  }
  return Array.from(byInitiative.entries()).map(
    ([initiativeKey, activityKeys]) => ({
      initiativeKey,
      activityKeys,
    }),
  )
}

export function SupervisorCascadeImportSelector({
  sectionId,
  supervisorContractId,
  supervisorId,
  disabled,
  onSelectionChange,
}: SupervisorCascadeImportSelectorProps) {
  const [options, setOptions] =
    React.useState<ManagerCascadeOptionsResponse | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedActivityKeys, setSelectedActivityKeys] = React.useState<
    Set<string>
  >(() => new Set())

  React.useEffect(() => {
    let cancelled = false
    const cacheKey = buildCacheKey({
      sectionId,
      supervisorContractId,
      supervisorId,
    })
    const cached = cascadeOptionsCache.get(cacheKey)
    const hasFreshCache =
      cached && Date.now() - cached.cachedAt < CASCADE_OPTIONS_STALE_MS
    if (hasFreshCache) {
      setOptions(cached.data)
      setIsLoading(false)
      setLoadError(null)
      return () => {
        cancelled = true
      }
    }

    const params = new URLSearchParams()
    if (supervisorContractId) {
      params.set('supervisorContractId', supervisorContractId)
    } else if (supervisorId) {
      params.set('supervisorId', supervisorId)
    }
    const qs = params.toString()
    setIsLoading(true)
    setLoadError(null)
    fetch(
      `/api/sections/${sectionId}/manager-cascade-options${qs ? `?${qs}` : ''}`,
    )
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load manager contract')
        }
        return data as ManagerCascadeOptionsResponse
      })
      .then(data => {
        if (!cancelled) {
          cascadeOptionsCache.set(cacheKey, {
            data,
            cachedAt: Date.now(),
          })
          setOptions(data)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load options',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sectionId, supervisorContractId, supervisorId])

  const blockedSelected = React.useMemo(() => {
    if (!options) return []
    const out: Array<{ activityKey: string; title: string }> = []
    for (const obj of options.objectives) {
      for (const init of obj.initiatives) {
        for (const kpi of init.kpis) {
          if (
            selectedActivityKeys.has(kpi.activityKey) &&
            !kpi.canCascade &&
            !kpi.alreadyImported
          ) {
            out.push({ activityKey: kpi.activityKey, title: kpi.title })
          }
        }
      }
    }
    return out
  }, [options, selectedActivityKeys])

  const importableSelectedCount = React.useMemo(() => {
    if (!options) return 0
    let n = 0
    for (const obj of options.objectives) {
      for (const init of obj.initiatives) {
        for (const kpi of init.kpis) {
          if (selectedActivityKeys.has(kpi.activityKey) && kpi.canCascade) {
            n += 1
          }
        }
      }
    }
    return n
  }, [options, selectedActivityKeys])

  React.useEffect(() => {
    if (!options) {
      onSelectionChange({
        selections: [],
        hasBlockedSelected: false,
        importableCount: 0,
      })
      return
    }
    const selections = buildSelections(options, selectedActivityKeys)
      .map(sel => ({
        ...sel,
        activityKeys: sel.activityKeys.filter(activityKey => {
          for (const obj of options.objectives) {
            for (const init of obj.initiatives) {
              const kpi = init.kpis.find(k => k.activityKey === activityKey)
              if (kpi) return kpi.canCascade
            }
          }
          return false
        }),
      }))
      .filter(s => s.activityKeys.length > 0)

    onSelectionChange({
      selections,
      hasBlockedSelected: blockedSelected.length > 0,
      importableCount: importableSelectedCount,
    })
  }, [
    options,
    selectedActivityKeys,
    blockedSelected.length,
    importableSelectedCount,
    onSelectionChange,
  ])

  function toggleKpi(activityKey: string) {
    setSelectedActivityKeys(prev => {
      const next = new Set(prev)
      if (next.has(activityKey)) next.delete(activityKey)
      else next.add(activityKey)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground py-4'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading manager contract…
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert variant='destructive'>
        <AlertTitle>Cannot load manager contract</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    )
  }

  if (!options || options.objectives.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        The manager contract has no KPIs available to cascade yet. You can
        onboard an empty contract and add your own items, or ask your manager to
        add KPIs with an AIM first.
      </p>
    )
  }

  return (
    <div className='space-y-4'>
      {blockedSelected.length > 0 && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Selected KPIs cannot be cascaded</AlertTitle>
          <AlertDescription>
            <p className='mb-2'>
              The following selected KPIs have no AIM on the manager contract.
              They will be blocked from import until your manager adds an AIM:
            </p>
            <ul className='list-disc pl-5 space-y-1'>
              {blockedSelected.map(item => (
                <li key={item.activityKey}>{item.title}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className='rounded-lg border max-h-[min(360px,50vh)] overflow-y-auto divide-y'>
        {options.objectives.map(obj => (
          <div key={obj.objectiveKey} className='pt-5 p-3 space-y-5'>
            <p className='text-xs tracking-wide text-foreground font-medium'>
              <span className='text-primary font-semibold'>
                SSMARTA Objective {obj.code ? `${obj.code} – ` : ''}
              </span>{' '}
              {obj.title.slice(0, 150)}
              {obj.title.length > 150 ? '…' : ''}
            </p>
            {obj.initiatives.map(init => (
              <div key={init.initiativeKey} className='space-y-4'>
                <p className='text-xs font-medium'>
                  Initiative {init.code ? `${init.code} – ` : ''}
                  <span className='font-normal text-muted-foreground'>
                    {init.title.slice(0, 100)}
                    {init.title.length > 100 ? '…' : ''}
                  </span>
                </p>
                <ul className='space-y-6'>
                  {init.kpis.map(kpi => {
                    const isSelected = selectedActivityKeys.has(kpi.activityKey)
                    const isBlockedSelection =
                      isSelected && !kpi.canCascade && !kpi.alreadyImported
                    const isAlreadyOnContract = kpi.alreadyImported
                    const checkboxDisabled = disabled || isAlreadyOnContract
                    const isCheckboxChecked = isSelected || isAlreadyOnContract

                    return (
                      <li
                        key={kpi.activityKey}
                        className={cn(
                          'flex gap-3 rounded-md border p-2',
                          isBlockedSelection &&
                            'border-destructive/50 bg-destructive/5',
                        )}
                      >
                        <Checkbox
                          id={`cascade-kpi-${kpi.activityKey}`}
                          checked={isCheckboxChecked}
                          disabled={checkboxDisabled}
                          onCheckedChange={() => toggleKpi(kpi.activityKey)}
                          className='mt-0.5'
                        />
                        <div className='flex-1 min-w-0 space-y-1'>
                          <Label
                            htmlFor={`cascade-kpi-${kpi.activityKey}`}
                            className={cn(
                              'text-xs font-medium leading-snug cursor-pointer',
                              checkboxDisabled &&
                                !kpi.alreadyImported &&
                                'cursor-not-allowed',
                            )}
                          >
                            KPI: {kpi.title}
                          </Label>
                          {kpi.hasAim ? (
                            <p className='text-xs text-muted-foreground'>
                              <span className='font-semibold'>AIM:</span>{' '}
                              {kpi.aim}
                            </p>
                          ) : (
                            <p className='text-xs text-destructive'>
                              No AIM — cannot cascade until manager adds one
                            </p>
                          )}
                          {isAlreadyOnContract ? (
                            <p className='text-xs text-orange-600 dark:text-orange-400'>
                              Already on your contract
                            </p>
                          ) : null}
                          {isBlockedSelection && (
                            <p className='text-xs text-destructive font-medium'>
                              Blocked from cascade — deselect or ask manager to
                              add an AIM
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
