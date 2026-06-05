'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { CascadeActivityRewrite, CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  buildRewriteDraftsFromPreview,
  draftsToRewritePayload,
  fetchCascadeRewritePreview,
  runCascadeImport,
} from '@/features/sections/components/cascade-import-client'
import { getSupervisorUpstreamContractNoun } from '@/lib/supervisor-cascade-labels'
import { invalidateSupervisorCascadeOptionsCache } from '@/features/sections/components/supervisor-cascade-import-selector'
import type { CascadeImportModeChoice } from '@/features/sections/components/supervisor-cascade-import-mode-dialog'

type FlowStep = 'select' | 'mode' | 'review'

interface UseSupervisorCascadeImportFlowOptions {
  sectionId: string
  supervisorContractId?: string
  supervisorId?: string
  isProjectWorkstream?: boolean
  onComplete?: () => void
}

export function useSupervisorCascadeImportFlow({
  sectionId,
  supervisorContractId,
  supervisorId,
  isProjectWorkstream = false,
  onComplete,
}: UseSupervisorCascadeImportFlowOptions) {
  const upstreamContractNoun = getSupervisorUpstreamContractNoun(
    isProjectWorkstream,
  )
  const router = useRouter()
  const [step, setStep] = React.useState<FlowStep>('select')
  const [isBusy, setIsBusy] = React.useState(false)
  const [selections, setSelections] = React.useState<CascadeImportSelection[]>(
    [],
  )
  const [importableCount, setImportableCount] = React.useState(0)
  const [hasBlockedSelected, setHasBlockedSelected] = React.useState(false)
  const [aiEnabled, setAiEnabled] = React.useState(false)
  const [isLoadingAiStatus, setIsLoadingAiStatus] = React.useState(false)
  const [reviewMode, setReviewMode] = React.useState<'as-is' | 'ai'>('ai')
  const [previewItems, setPreviewItems] = React.useState<
    Awaited<ReturnType<typeof fetchCascadeRewritePreview>>['items']
  >([])
  const [drafts, setDrafts] = React.useState<
    Record<string, CascadeActivityRewrite>
  >({})
  const [importMode, setImportMode] =
    React.useState<CascadeImportModeChoice | null>(null)

  const resetFlow = React.useCallback(() => {
    setStep('select')
    setIsBusy(false)
    setSelections([])
    setImportableCount(0)
    setHasBlockedSelected(false)
    setAiEnabled(false)
    setIsLoadingAiStatus(false)
    setReviewMode('ai')
    setPreviewItems([])
    setDrafts({})
    setImportMode(null)
  }, [])

  const handleSelectionChange = React.useCallback(
    (payload: {
      selections: CascadeImportSelection[]
      hasBlockedSelected: boolean
      importableCount: number
    }) => {
      setSelections(payload.selections)
      setHasBlockedSelected(payload.hasBlockedSelected)
      setImportableCount(payload.importableCount)
    },
    [],
  )

  const finishImport = React.useCallback(
    async (rewrites?: CascadeActivityRewrite[]) => {
      if (!supervisorContractId) {
        throw new Error('Supervisor contract is not ready yet')
      }

      const data = await runCascadeImport(
        supervisorContractId,
        selections,
        rewrites,
      )
      invalidateSupervisorCascadeOptionsCache({
        sectionId,
        supervisorContractId,
        supervisorId,
      })
      const importedCount = Array.isArray(data.importedActivityKeys)
        ? data.importedActivityKeys.length
        : importableCount
      const itemLabel = isProjectWorkstream
        ? `initiative${importedCount === 1 ? '' : 's'}`
        : `KPI${importedCount === 1 ? '' : 's'}`
      toast.success(
        `Cascaded ${importedCount} ${itemLabel} from ${upstreamContractNoun}`,
      )
      router.refresh()
      onComplete?.()
      resetFlow()
    },
    [
      supervisorContractId,
      selections,
      sectionId,
      supervisorId,
      importableCount,
      upstreamContractNoun,
      router,
      onComplete,
      resetFlow,
    ],
  )

  const openModeStep = React.useCallback(async () => {
    if (!supervisorContractId || importableCount === 0 || hasBlockedSelected) {
      return
    }

    setStep('mode')
    setImportMode(null)
    setIsLoadingAiStatus(true)
    try {
      const preview = await fetchCascadeRewritePreview(
        supervisorContractId,
        selections,
        false,
      )
      setAiEnabled(preview.aiEnabled)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to prepare import',
      )
      setStep('select')
    } finally {
      setIsLoadingAiStatus(false)
    }
  }, [
    supervisorContractId,
    importableCount,
    hasBlockedSelected,
    selections,
  ])

  const handleSelectSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (hasBlockedSelected || importableCount === 0) return
      void openModeStep()
    },
    [hasBlockedSelected, importableCount, openModeStep],
  )

  const handleChooseAsIs = React.useCallback(async () => {
    if (!supervisorContractId) return
    setIsBusy(true)
    try {
      await finishImport()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to import')
    } finally {
      setIsBusy(false)
    }
  }, [supervisorContractId, finishImport])

  const handleChooseAi = React.useCallback(async () => {
    if (!supervisorContractId || !aiEnabled) return
    setIsBusy(true)
    setReviewMode('ai')
    try {
      const preview = await fetchCascadeRewritePreview(
        supervisorContractId,
        selections,
        true,
      )
      setPreviewItems(preview.items)
      setDrafts(buildRewriteDraftsFromPreview(preview, 'ai'))
      setStep('review')
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate AI rewrite',
      )
    } finally {
      setIsBusy(false)
    }
  }, [supervisorContractId, aiEnabled, selections])

  const handleConfirmReviewImport = React.useCallback(async () => {
    setIsBusy(true)
    try {
      await finishImport(draftsToRewritePayload(drafts))
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to import')
    } finally {
      setIsBusy(false)
    }
  }, [finishImport, drafts])

  const handleModeFinish = React.useCallback(async () => {
    if (importMode === 'as-is') {
      await handleChooseAsIs()
      return
    }
    if (importMode === 'ai') {
      await handleChooseAi()
    }
  }, [importMode, handleChooseAsIs, handleChooseAi])

  const handleBackFromMode = React.useCallback(() => {
    setImportMode(null)
    setStep('select')
  }, [])

  const handleBackFromReview = React.useCallback(() => {
    setStep('mode')
  }, [])

  return {
    step,
    resetFlow,
    isBusy,
    selections,
    importableCount,
    hasBlockedSelected,
    aiEnabled,
    isLoadingAiStatus,
    importMode,
    setImportMode,
    reviewMode,
    previewItems,
    drafts,
    setDrafts,
    handleSelectionChange,
    handleSelectSubmit,
    handleModeFinish,
    handleConfirmReviewImport,
    handleBackFromMode,
    handleBackFromReview,
  }
}
