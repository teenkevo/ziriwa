'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { useFinancialYear } from '@/contexts/financial-year-context'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardDivisionContractDialog } from '@/features/sections/components/onboard-division-contract-dialog'
import { ContractOnboardEmptyState } from '@/features/sections/components/contract-onboard-empty-state'
import {
  PlanningContractDelegateCta,
  PlanningContractSupportStatus,
} from '@/features/delegation/planning-contract-delegation-panel'
import { PlanningContractSupportDialog } from '@/features/delegation/planning-contract-support-dialog'
import type { AssistantCommissionerContractPageData } from './load-assistant-commissioner-contract'

export function AssistantCommissionerContractContent({
  division,
  divisionContract,
  assistantCommissioner,
  assistantCommissionerStaffIdForOnboarding,
  canManageContract,
  planningContractSupport,
}: AssistantCommissionerContractPageData) {
  const router = useRouter()
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [delegateOpen, setDelegateOpen] = React.useState(false)
  const [isCancellingSupport, setIsCancellingSupport] = React.useState(false)
  const { active: activeFY } = useFinancialYear()

  const divisionName = division.fullName || division.acronym || division.name
  const currentFY = divisionContract?.financialYearLabel ?? activeFY.label
  const assistantCommissionerRefId =
    assistantCommissioner?._id ?? assistantCommissionerStaffIdForOnboarding ?? ''
  const hasAssistantCommissionerRef = Boolean(assistantCommissionerRefId)
  const activeSupport = planningContractSupport?.activeSupport ?? null

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: 'Assistant Commissioner',
          href: '/assistant-commissioner/dashboard',
        },
        { label: 'Performance Contract' },
      ],
      [],
    ),
  )

  async function cancelContractSupport() {
    if (!activeSupport?._id) return
    setIsCancellingSupport(true)
    try {
      const res = await fetch(`/api/section-delegations/${activeSupport._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel')
      }
      toast.success('Contract support cancelled')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setIsCancellingSupport(false)
    }
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Performance Contract</h1>
        </div>

        {planningContractSupport ? (
          <>
            {activeSupport ? (
              <PlanningContractSupportStatus
                toStaffName={activeSupport.toStaffName}
                endDate={activeSupport.endDate}
                onCancel={cancelContractSupport}
                isCancelling={isCancellingSupport}
              />
            ) : (
              <PlanningContractDelegateCta
                onDelegate={() => setDelegateOpen(true)}
                disabled={
                  !planningContractSupport.sectionId ||
                  planningContractSupport.candidates.length === 0
                }
                unavailableReason={planningContractSupport.unavailableReason}
              />
            )}
            {planningContractSupport.sectionId ? (
              <PlanningContractSupportDialog
                open={delegateOpen}
                onOpenChange={setDelegateOpen}
                candidates={planningContractSupport.candidates}
                sectionId={planningContractSupport.sectionId}
                mode='ac-to-supervisor'
                onSuccess={() => router.refresh()}
              />
            ) : null}
          </>
        ) : null}

        {divisionContract ? (
              <DepartmentContractTree
                departmentContract={divisionContract}
                contractsApi='division-contracts'
                canManageContract={canManageContract}
              />
            ) : (
              <div className='space-y-4'>
                <OnboardDivisionContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  divisionId={division._id}
                  assistantCommissionerId={assistantCommissionerRefId}
                  divisionName={divisionName}
                  assistantCommissionerName={
                    assistantCommissioner?.fullName ??
                    'You (assistant commissioner)'
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Onboard a division contract to add SSMARTA objectives, initiatives, and measurable activities.'
                  canOnboard={
                    canManageContract && hasAssistantCommissionerRef
                  }
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    canManageContract && !hasAssistantCommissionerRef
                      ? "Your account could not be linked to an assistant commissioner staff record for this division. Update the division's assistant commissioner in Sanity or ensure your staff profile uses the same email and role."
                      : undefined
                  }
                />
              </div>
            )}
      </div>
    </div>
  )
}
