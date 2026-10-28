'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type {
  CascadeImportSelection,
  SupervisorCascadeOptionsResponse,
} from '@/lib/contract-cascade/types'

interface OfficerCascadeImportSelectorProps {
  sectionId: string
  officerContractId?: string
  supervisorContractId?: string
  isProjectWorkstream?: boolean
  disabled?: boolean
  onSelectionChange: (payload: {
    selections: CascadeImportSelection[]
    importableCount: number
  }) => void
}

const CASCADE_OPTIONS_STALE_MS = 30_000
const cascadeOptionsCache = new Map<
  string,
  { data: SupervisorCascadeOptionsResponse; cachedAt: number }
>()

function buildCacheKey(params: {
  sectionId: string
  officerContractId?: string
  supervisorContractId?: string
}) {
  return [
    params.sectionId,
    params.officerContractId ?? '',
    params.supervisorContractId ?? '',
  ].join('::')
}

export function invalidateOfficerCascadeOptionsCache(params: {
  sectionId: string
  officerContractId?: string
  supervisorContractId?: string
}) {
  cascadeOptionsCache.delete(buildCacheKey(params))
}

function buildSelections(
  options: SupervisorCascadeOptionsResponse,
  selectedActivityKeys: Set<string>,
): CascadeImportSelection[] {
  const byInitiative = new Map<string, string[]>()

  for (const obj of options.objectives) {
    for (const init of obj.initiatives) {
      for (const activity of init.kpis) {
        if (
          !selectedActivityKeys.has(activity.activityKey) ||
          !activity.canCascade
        ) {
          continue
        }
        const keys = byInitiative.get(init.initiativeKey) ?? []
        keys.push(activity.activityKey)
        byInitiative.set(init.initiativeKey, keys)
      }
    }
  }

  return Array.from(byInitiative.entries()).map(
    ([initiativeKey, activityKeys]) => ({
      initiativeKey,
      activityKeys,
      activities: activityKeys.map(activityKey => ({
        activityKey,
        taskKeys: [],
      })),
    }),
  )
}

export function OfficerCascadeImportSelector({
  sectionId,
  officerContractId,
  supervisorContractId,
  isProjectWorkstream = false,
  disabled,
  onSelectionChange,
}: OfficerCascadeImportSelectorProps) {
  const [options, setOptions] =
    React.useState<SupervisorCascadeOptionsResponse | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedActivityKeys, setSelectedActivityKeys] = React.useState<
    Set<string>
  >(() => new Set())

  React.useEffect(() => {
    let cancelled = false
    const cacheKey = buildCacheKey({
      sectionId,
      officerContractId,
      supervisorContractId,
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
    if (officerContractId) params.set('officerContractId', officerContractId)
    if (supervisorContractId) {
      params.set('supervisorContractId', supervisorContractId)
    }
    const qs = params.toString()
    setIsLoading(true)
    setLoadError(null)
    fetch(
      `/api/sections/${sectionId}/supervisor-cascade-options${qs ? `?${qs}` : ''}`,
    )
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load supervisor contract')
        }
        return data as SupervisorCascadeOptionsResponse
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
  }, [sectionId, officerContractId, supervisorContractId])

  const importableSelectedCount = React.useMemo(() => {
    if (!options) return 0
    let count = 0
    for (const obj of options.objectives) {
      for (const init of obj.initiatives) {
        for (const activity of init.kpis) {
          if (
            selectedActivityKeys.has(activity.activityKey) &&
            activity.canCascade
          ) {
            count += 1
          }
        }
      }
    }
    return count
  }, [options, selectedActivityKeys])

  React.useEffect(() => {
    if (!options) {
      onSelectionChange({
        selections: [],
        importableCount: 0,
      })
      return
    }

    onSelectionChange({
      selections: buildSelections(options, selectedActivityKeys),
      importableCount: importableSelectedCount,
    })
  }, [options, selectedActivityKeys, importableSelectedCount, onSelectionChange])

  function toggleActivity(activityKey: string) {
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
        Loading supervisor contract…
      </div>
    )
  }

  if (loadError) {
    return (
      <p className='text-sm text-destructive' role='alert'>
        {loadError}
      </p>
    )
  }

  if (!options || options.objectives.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        {isProjectWorkstream ? (
          <>
            The workstream lead contract has no measurable activities yet. Ask
            your workstream lead to add measurable activities on their contract
            before you can cascade measurable activities.
          </>
        ) : (
          <>
            The supervisor contract has no measurable activities available to
            cascade yet. You can onboard an empty contract and add your own
            items, or ask your supervisor to add initiatives and measurables
            first.
          </>
        )}
      </p>
    )
  }

  return (
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
              <ul className='space-y-2'>
                {init.kpis.map(activity => {
                  const isSelected = selectedActivityKeys.has(activity.activityKey)
                  const isAlreadyOnContract = activity.alreadyImported
                  const checkboxDisabled = disabled || !activity.canCascade
                  const isCheckboxChecked = isSelected || isAlreadyOnContract

                  return (
                    <li
                      key={activity.activityKey}
                      className='flex items-start gap-2'
                    >
                      <Checkbox
                        id={`officer-cascade-activity-${activity.activityKey}`}
                        checked={isCheckboxChecked}
                        disabled={checkboxDisabled}
                        onCheckedChange={() =>
                          toggleActivity(activity.activityKey)
                        }
                        className='mt-0.5'
                      />
                      <div className='min-w-0 flex-1'>
                        <Label
                          htmlFor={`officer-cascade-activity-${activity.activityKey}`}
                          className={cn(
                            'block cursor-pointer text-xs font-normal leading-tight',
                            checkboxDisabled && 'cursor-not-allowed',
                            checkboxDisabled &&
                              !isAlreadyOnContract &&
                              'opacity-70',
                          )}
                        >
                          {activity.title}
                        </Label>
                        {isAlreadyOnContract ? (
                          <p className='text-xs text-orange-600 dark:text-orange-400'>
                            Already on your contract
                          </p>
                        ) : null}
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
  )
}
