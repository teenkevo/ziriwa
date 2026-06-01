'use client'

import * as React from 'react'
import { ChevronsDown, ChevronsUp, FileText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardDepartmentContractDialog } from '@/features/sections/components/onboard-department-contract-dialog'
import type { CommissionerContractPageData } from './load-commissioner-contract'

export function CommissionerContractContent({
  department,
  departmentContract,
  commissioner,
  commissionerStaffIdForOnboarding,
  canManageContract,
}: CommissionerContractPageData) {
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [expandAllSignal, setExpandAllSignal] = React.useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = React.useState(0)
  const [treeBulkExpanded, setTreeBulkExpanded] = React.useState(false)
  const [addObjectiveSignal, setAddObjectiveSignal] = React.useState(0)

  const departmentName =
    department.fullName || department.acronym || department.name
  const currentFY = departmentContract?.financialYearLabel ?? 'current FY'
  const commissionerRefId =
    commissioner?._id ?? commissionerStaffIdForOnboarding ?? ''
  const hasCommissionerRef = Boolean(commissionerRefId)

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Contract</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Manage SSMARTA objectives, initiatives, and measurable activities
            for {departmentName}.
          </p>
        </div>

        <Card>
          <CardContent className='pt-6'>
            {departmentContract ? (
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
                  departmentContract={departmentContract}
                  canManageContract={canManageContract}
                  expandAllSignal={expandAllSignal}
                  collapseAllSignal={collapseAllSignal}
                  addObjectiveSignal={addObjectiveSignal}
                  onAddObjectiveRequestConsumed={() => setAddObjectiveSignal(0)}
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <OnboardDepartmentContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  departmentId={department._id}
                  commissionerId={commissionerRefId}
                  departmentName={departmentName}
                  commissionerName={
                    commissioner?.fullName ?? 'You (commissioner)'
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard a department contract to add SSMARTA objectives,
                  initiatives, and measurable activities.
                </p>
                {canManageContract && hasCommissionerRef ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard contract
                  </Button>
                ) : canManageContract && !hasCommissionerRef ? (
                  <p className='text-sm text-muted-foreground'>
                    Your account could not be linked to a commissioner staff record
                    for this department. Update the department&apos;s commissioner
                    in Sanity or ensure your staff profile uses the same email and
                    role.
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
