'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { MEMBER_BY_ID_QUERYResult } from '../../../../sanity.types'
import { NumericFormat } from 'react-number-format'

interface TierSelectionProps {
  member: MEMBER_BY_ID_QUERYResult[number]
}

export function TierSelection({ member }: TierSelectionProps) {
  const currentYear = new Date().getFullYear()

  // Get current year tier from tierHistory
  const currentYearTier = member.tierHistory?.find(
    entry => entry.year === currentYear,
  )

  // Get tier history sorted by year (descending), excluding current year
  const tierHistory = member.tierHistory
    ? [...member.tierHistory]
        .filter(entry => entry.year !== null && entry.year < currentYear)
        .sort((a, b) => (b.year || 0) - (a.year || 0))
    : []

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Contribution Tiers</CardTitle>
        <CardDescription className='text-xs'>Current tier</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3 pt-0'>
        {/* Current Year Tier (Read-only) */}
        {currentYearTier && (
          <div className='flex items-center justify-between p-2 border rounded-md bg-primary/5'>
            <div className='flex items-center gap-2'>
              <div className='flex flex-col'>
                <div className='text-sm font-medium'>
                  {currentYear} -{' '}
                  {(currentYearTier.tier as any)?.title ||
                    (currentYearTier.tier as any)?.name ||
                    'Unknown Tier'}
                </div>
                {currentYearTier.dateAssigned && (
                  <div className='text-xs text-muted-foreground'>
                    Assigned:{' '}
                    {new Date(
                      currentYearTier.dateAssigned,
                    ).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <Badge variant='default' className='ml-auto'>
              <NumericFormat
                value={currentYearTier.tier?.amount || 0}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
              /month
            </Badge>
          </div>
        )}

        {/* Previous Years (Read-only) */}
        {tierHistory.length > 0 && (
          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-muted-foreground'>
              Previous Years
            </label>
            <div className='grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2'>
              {tierHistory.map((entry, index) => {
                const tier = entry.tier
                if (!tier || !entry.year) return null

                return (
                  <div
                    key={`${entry.year}-${index}`}
                    className='flex items-center p-2 border-dotted border rounded-md bg-muted/30'
                  >
                    <div className='flex items-center gap-2'>
                      <div className='flex flex-col'>
                        <div className='text-sm font-medium'>
                          {entry.year} -{' '}
                          {(tier as any).title ||
                            (tier as any).name ||
                            'Unknown Tier'}
                        </div>
                        {entry.dateAssigned && (
                          <div className='text-xs text-muted-foreground'>
                            Assigned:{' '}
                            {new Date(entry.dateAssigned).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant='outline' className='ml-auto text-xs'>
                      <NumericFormat
                        value={tier.amount || 0}
                        displayType='text'
                        thousandSeparator={true}
                        prefix='UGX '
                      />
                      /mo
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!currentYearTier && tierHistory.length === 0 && (
          <p className='text-xs text-muted-foreground text-center py-2'>
            No tier history available
          </p>
        )}
      </CardContent>
    </Card>
  )
}
