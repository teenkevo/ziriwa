'use client'

import * as React from 'react'

import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'

import { CommissionerStakeholderEngagementsTable } from './commissioner-stakeholder-engagements-table'
import type { CommissionerStakeholderEngagementsData } from './load-commissioner-stakeholder-engagements'

export function CommissionerStakeholderEngagementsContent({
  financialYearLabel,
  rows,
}: CommissionerStakeholderEngagementsData) {
  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: 'Commissioner', href: '/commissioner/dashboard' },
        { label: 'Stakeholder engagements' },
      ],
      [],
    ),
  )

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Stakeholder engagements</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            All stakeholder engagements across all the divisions.
          </p>
        </div>

        <CommissionerStakeholderEngagementsTable
          rows={rows}
          financialYearLabel={financialYearLabel}
        />
      </div>
    </div>
  )
}
