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
  ContractActionsMenu,
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
  assigneeOptions,
}: AssistantCommissionerContractPageData) {
  const router = useRouter()
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [delegateOpen, setDelegateOpen] = React.useState(false)
  const [finalizeRequest, setFinalizeRequest] = React.useState(0)
  const [unfinalizeRequest, setUnfinalizeRequest] = React.useState(0)
  const [isCancellingSupport, setIsCancellingSupport] = React.useState(false)
  const { active: activeFY, isHistorical } = useFinancialYear()

  const divisionName = division.fullName || division.acronym || division.name
  const currentFY = divisionContract?.financialYearLabel ?? activeFY.label
  const assistantCommissionerRefId =
    assistantCommissioner?._id ?? assistantCommissionerStaffIdForOnboarding ?? ''
  const hasAssistantCommissionerRef = Boolean(assistantCommissionerRefId)
  const activeSupport = planningContractSupport?.activeSupport ?? null
  const isFinalized = divisionContract?.status === 'finalized'
  const canDelegate =
    Boolean(planningContractSupport?.sectionId) &&
    (planningContractSupport?.candidates.length ?? 0) > 0 &&
    !activeSupport
  const showContractActions =
    Boolean(planningContractSupport) && !isHistorical && canManageContract

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
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Manage your performance contract and deliverables
          </p>
        </div>

        {planningContractSupport ? (
          <>
            {activeSupport ? (
              <PlanningContractSupportStatus
                toStaffName={activeSupport.toStaffName}
                endDate={activeSupport.endDate}
                onCancel={isHistorical ? undefined : cancelContractSupport}
                isCancelling={isCancellingSupport}
              />
            ) : null}
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
                activityPageBasePath='/assistant-commissioner/contract'
                assigneeOptions={assigneeOptions}
                assigneeEmptyLabel='No managers in this division yet.'
                unassignedLabel='Assign a manager'
                hideFinalizeActions={showContractActions}
                contractActions={
                  showContractActions && planningContractSupport ? (
                    <ContractActionsMenu
                      onDelegate={() => setDelegateOpen(true)}
                      delegateDisabled={!canDelegate}
                      delegateDisabledReason={
                        activeSupport
                          ? 'Contract entry is already delegated.'
                          : planningContractSupport.unavailableReason
                      }
                      onFinalize={() => {
                        if (isFinalized) {
                          setUnfinalizeRequest(count => count + 1)
                          return
                        }
                        setFinalizeRequest(count => count + 1)
                      }}
                      finalizeDisabled={false}
                      hideFinalize={
                        Boolean(divisionContract.cascadeHoldMessage) &&
                        !isFinalized
                      }
                      finalizeLabel={
                        isFinalized ? 'Unfinalize' : 'Finalize contract'
                      }
                    />
                  ) : null
                }
                finalizeRequest={finalizeRequest}
                unfinalizeRequest={unfinalizeRequest}
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
