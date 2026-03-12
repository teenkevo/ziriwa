'use client'

import * as React from 'react'

import { Card, CardContent } from '@/components/ui/card'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

const AXIS = ['H', 'M', 'L'] as const

function getQuadrant(power?: string, interest?: string): string {
  const p = power && AXIS.includes(power as (typeof AXIS)[number]) ? power : null
  const i = interest && AXIS.includes(interest as (typeof AXIS)[number]) ? interest : null
  if (!p || !i) return 'other'
  return `${p}-${i}`
}

interface StakeholderMatrixProps {
  stakeholders: StakeholderEntry[]
  onSelect: (entry: StakeholderEntry, index: number) => void
}

export function StakeholderMatrix({ stakeholders, onSelect }: StakeholderMatrixProps) {
  const byQuadrant = React.useMemo(() => {
    const map = new Map<string, { entry: StakeholderEntry; index: number }[]>()
    stakeholders.forEach((s, i) => {
      const q = getQuadrant(s.power, s.interest)
      if (q === 'other') return
      const list = map.get(q) ?? []
      list.push({ entry: s, index: i })
      map.set(q, list)
    })
    return map
  }, [stakeholders])

  return (
    <div className='space-y-2'>
      <p className='text-sm text-muted-foreground'>
        Power (influence) × Interest matrix. Click a stakeholder to edit.
      </p>
      <div className='grid grid-cols-3 gap-2'>
        {AXIS.map(interest =>
          AXIS.map(power => {
            const key = `${power}-${interest}`
            const list = byQuadrant.get(key) ?? []
            const label =
              power === 'H' && interest === 'H'
                ? 'Manage closely'
                : power === 'L' && interest === 'H'
                  ? 'Keep informed'
                  : power === 'H' && interest === 'L'
                    ? 'Keep satisfied'
                    : power === 'L' && interest === 'L'
                      ? 'Monitor'
                      : `${power}/${interest}`
            return (
              <Card key={key} className='min-h-[120px]'>
                <CardContent className='p-3'>
                  <div className='text-xs font-medium text-muted-foreground mb-2'>
                    {power}×{interest} {label !== `${power}/${interest}` ? `(${label})` : ''}
                  </div>
                  <div className='space-y-1'>
                    {list.length === 0 ? (
                      <p className='text-xs text-muted-foreground italic'>—</p>
                    ) : (
                      list.map(({ entry, index }) => (
                        <button
                          key={entry._key}
                          type='button'
                          className='block w-full text-left text-sm px-2 py-1 rounded hover:bg-muted transition-colors truncate'
                          onClick={() => onSelect(entry, index)}
                        >
                          {entry.name}
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          }),
        )}
      </div>
    </div>
  )
}
