'use client'

import * as React from 'react'

import { useFinancialYear } from '@/contexts/financial-year-context'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardDepartmentContractDialog } from '@/features/sections/components/onboard-department-contract-dialog'
import { ContractOnboardEmptyState } from '@/features/sections/components/contract-onboard-empty-state'
import type { CommissionerContractPageData } from './load-commissioner-contract'

export function CommissionerContractContent({
  department,
  departmentContract,
  commissioner,
  commissionerStaffIdForOnboarding,
  canManageContract,
}: CommissionerContractPageData) {
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const { active: activeFY } = useFinancialYear()

  const departmentName =
    department.fullName || department.acronym || department.name
  const currentFY = departmentContract?.financialYearLabel ?? activeFY.label
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

        {departmentContract ? (
              <DepartmentContractTree
                departmentContract={departmentContract}
                canManageContract={canManageContract}
              />
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
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Onboard a department contract to add SSMARTA objectives, initiatives, and measurable activities.'
                  canOnboard={canManageContract && hasCommissionerRef}
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    canManageContract && !hasCommissionerRef
                      ? "Your account could not be linked to a commissioner staff record for this department. Update the department's commissioner in Sanity or ensure your staff profile uses the same email and role."
                      : undefined
                  }
                />
              </div>
            )}
      </div>
    </div>
  )
}
