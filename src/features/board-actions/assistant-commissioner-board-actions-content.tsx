'use client'

import * as React from 'react'

import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { CommissionerBoardActionsTable } from './commissioner-board-actions-table'
import type {
  AssistantBoardActionRow,
  AssistantSectionOption,
} from './load-assistant-commissioner-board-actions'

export function AssistantCommissionerBoardActionsContent({
  divisionName,
  actions,
}: {
  divisionName: string
  actions: AssistantBoardActionRow[]
  sectionOptions: AssistantSectionOption[]
}) {
  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: 'Assistant Commissioner',
          href: '/assistant-commissioner/dashboard',
        },
        { label: 'Board Actions' },
      ],
      [],
    ),
  )

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div>
          <h1 className='text-2xl font-bold'>Board Actions</h1>
          <p className='text-sm text-muted-foreground'>
            Actions assigned to {divisionName}. Open an action to delegate it to
            a section.
          </p>
        </div>

        <CommissionerBoardActionsTable
          data={actions}
          emptyDescription='No board actions are assigned to your division right now.'
          basePath='/assistant-commissioner/board-actions'
          readOnly
        />
      </div>
    </div>
  )
}
