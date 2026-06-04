'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { taskSelectionId } from '@/lib/contract-cascade/officer-cascade-selection'
import type {
  CascadeImportSelection,
  SupervisorCascadeOptionsResponse,
} from '@/lib/contract-cascade/types'

interface OfficerCascadeImportSelectorProps {
  sectionId: string
  officerContractId?: string
  supervisorContractId?: string
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
  selectedTaskIds: Set<string>,
): CascadeImportSelection[] {
  const byInitiative = new Map<string, Map<string, Set<string>>>()

  for (const obj of options.objectives) {
    for (const init of obj.initiatives) {
      for (const kpi of init.kpis) {
        for (const task of kpi.tasks ?? []) {
          const id = taskSelectionId(kpi.activityKey, task.taskKey)
          if (!selectedTaskIds.has(id) || !task.canCascade) continue
          let activities = byInitiative.get(init.initiativeKey)
          if (!activities) {
            activities = new Map()
            byInitiative.set(init.initiativeKey, activities)
          }
          const taskKeys = activities.get(kpi.activityKey) ?? new Set()
          taskKeys.add(task.taskKey)
          activities.set(kpi.activityKey, taskKeys)
        }
      }
    }
  }

  return Array.from(byInitiative.entries()).map(
    ([initiativeKey, activities]) => {
      const activityEntries = Array.from(activities.entries()).map(
        ([activityKey, taskKeys]) => ({
          activityKey,
          taskKeys: Array.from(taskKeys),
        }),
      )
      return {
        initiativeKey,
        activityKeys: activityEntries.map(entry => entry.activityKey),
        activities: activityEntries,
      }
    },
  )
}

export function OfficerCascadeImportSelector({
  sectionId,
  officerContractId,
  supervisorContractId,
  disabled,
  onSelectionChange,
}: OfficerCascadeImportSelectorProps) {
  const [options, setOptions] =
    React.useState<SupervisorCascadeOptionsResponse | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(
    () => new Set(),
  )

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
        for (const kpi of init.kpis) {
          for (const task of kpi.tasks ?? []) {
            const id = taskSelectionId(kpi.activityKey, task.taskKey)
            if (selectedTaskIds.has(id) && task.canCascade) count += 1
          }
        }
      }
    }
    return count
  }, [options, selectedTaskIds])

  React.useEffect(() => {
    if (!options) {
      onSelectionChange({
        selections: [],
        importableCount: 0,
      })
      return
    }

    onSelectionChange({
      selections: buildSelections(options, selectedTaskIds),
      importableCount: importableSelectedCount,
    })
  }, [options, selectedTaskIds, importableSelectedCount, onSelectionChange])

  function toggleTask(id: string) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
        The supervisor contract has no measurable activities available to
        cascade yet. You can onboard an empty contract and add your own items,
        or ask your supervisor to add initiatives and measurables first.
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
              <ul className='space-y-3'>
                {init.kpis.map(kpi => {
                  const tasks = kpi.tasks ?? []
                  const allTasksImported =
                    tasks.length > 0 &&
                    tasks.every(task => task.alreadyImported)

                  return (
                    <li
                      key={kpi.activityKey}
                      className={cn(
                        'space-y-3',
                        allTasksImported && 'opacity-60',
                      )}
                    >
                      <p className='text-xs font-medium leading-normal'>
                        KPI:{' '}
                        <span className='font-normal text-muted-foreground'>
                          {kpi.title}
                        </span>
                      </p>
                      <p className='text-[11px] font-medium uppercase underline tracking-wide'>
                        Detailed tasks
                      </p>
                      {tasks.length === 0 ? (
                        <p className='text-xs text-muted-foreground'>
                          No detailed tasks on this KPI yet.
                        </p>
                      ) : (
                        <ul className='space-y-2'>
                          {tasks.map(task => {
                            const id = taskSelectionId(
                              kpi.activityKey,
                              task.taskKey,
                            )
                            const isSelected = selectedTaskIds.has(id)
                            const checkboxDisabled =
                              disabled || !task.canCascade

                            return (
                              <li key={id} className='flex items-start gap-2'>
                                <Checkbox
                                  id={`officer-cascade-task-${id}`}
                                  checked={isSelected}
                                  disabled={checkboxDisabled}
                                  onCheckedChange={() => toggleTask(id)}
                                  className='mt-0.5'
                                />
                                <div className='flex-1 min-w-0'>
                                  <Label
                                    htmlFor={`officer-cascade-task-${id}`}
                                    className={cn(
                                      'block text-xs font-normal leading-tight cursor-pointer',
                                      checkboxDisabled &&
                                        'cursor-not-allowed opacity-70',
                                    )}
                                  >
                                    {task.title}
                                  </Label>
                                  {task.alreadyImported ? (
                                    <p className='text-xs text-muted-foreground'>
                                      Already on your contract
                                    </p>
                                  ) : null}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
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
