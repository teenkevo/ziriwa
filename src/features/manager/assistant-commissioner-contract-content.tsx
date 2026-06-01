'use client'

import * as React from 'react'
import { ChevronsDown, ChevronsUp, FileText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardDivisionContractDialog } from '@/features/sections/components/onboard-division-contract-dialog'
import type { AssistantCommissionerContractPageData } from './load-assistant-commissioner-contract'

export function AssistantCommissionerContractContent({
  division,
  divisionContract,
  assistantCommissioner,
  assistantCommissionerStaffIdForOnboarding,
  canManageContract,
}: AssistantCommissionerContractPageData) {
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [expandAllSignal, setExpandAllSignal] = React.useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = React.useState(0)
  const [treeBulkExpanded, setTreeBulkExpanded] = React.useState(false)
  const [addObjectiveSignal, setAddObjectiveSignal] = React.useState(0)

  const divisionName = division.fullName || division.acronym || division.name
  const currentFY = divisionContract?.financialYearLabel ?? 'current FY'
  const assistantCommissionerRefId =
    assistantCommissioner?._id ?? assistantCommissionerStaffIdForOnboarding ?? ''
  const hasAssistantCommissionerRef = Boolean(assistantCommissionerRefId)

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: 'Assistant Commissioner',
          href: '/assistant-commissioner/dashboard',
        },
        { label: 'Contract' },
      ],
      [],
    ),
  )

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Contract</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Manage SSMARTA objectives, initiatives, and measurable activities
            for {divisionName}.
          </p>
        </div>

        <Card>
          <CardContent className='pt-6'>
            {divisionContract ? (
              <div className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex min-w-0 items-center gap-2 text-sm'>
                    <FileText className='h-5 w-5 shrink-0' />
                    <span className='truncate'>{currentFY}</span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 sm:shrink-0'>
                    {canManageContract ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => setAddObjectiveSignal(s => s + 1)}
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Add SSMARTA objective
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        if (treeBulkExpanded) {
                          setCollapseAllSignal(s => s + 1)
                          setExpandAllSignal(0)
                          setTreeBulkExpanded(false)
                        } else {
                          setExpandAllSignal(s => s + 1)
                          setTreeBulkExpanded(true)
                        }
                      }}
                    >
                      {treeBulkExpanded ? (
                        <ChevronsUp className='h-4 w-4' />
                      ) : (
                        <ChevronsDown className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>
                <DepartmentContractTree
                  departmentContract={divisionContract}
                  contractsApi='division-contracts'
                  canManageContract={canManageContract}
                  expandAllSignal={expandAllSignal}
                  collapseAllSignal={collapseAllSignal}
                  addObjectiveSignal={addObjectiveSignal}
                  onAddObjectiveRequestConsumed={() => setAddObjectiveSignal(0)}
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <OnboardDivisionContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  divisionId={division._id}
                  assistantCommissionerId={assistantCommissionerRefId}
                  divisionName={divisionName}
                  assistantCommissionerName={
                    assistantCommissioner?.fullName ?? 'You (assistant commissioner)'
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard a division contract to add SSMARTA objectives,
                  initiatives, and measurable activities.
                </p>
                {canManageContract && hasAssistantCommissionerRef ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard contract
                  </Button>
                ) : canManageContract && !hasAssistantCommissionerRef ? (
                  <p className='text-sm text-muted-foreground'>
                    Your account could not be linked to an assistant commissioner
                    staff record for this division. Update the division&apos;s
                    assistant commissioner in Sanity or ensure your staff profile
                    uses the same email and role.
                  </p>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    You do not have permission to onboard this contract.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
