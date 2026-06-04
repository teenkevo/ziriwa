'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { CascadeActivityRewrite, CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  buildRewriteDraftsFromPreview,
  draftsToRewritePayload,
  fetchOfficerCascadeRewritePreview,
  runOfficerCascadeImport,
} from '@/features/sections/components/cascade-import-client'
import { countOfficerImportableTasks } from '@/lib/contract-cascade/officer-cascade-selection'
import { invalidateOfficerCascadeOptionsCache } from '@/features/sections/components/officer-cascade-import-selector'
import type { OfficerCascadeImportModeChoice } from '@/features/sections/components/officer-cascade-import-mode-dialog'

type FlowStep = 'select' | 'mode' | 'review'

interface UseOfficerCascadeImportFlowOptions {
  sectionId: string
  officerContractId?: string
  supervisorContractId?: string
  onComplete?: () => void
}

export function useOfficerCascadeImportFlow({
  sectionId,
  officerContractId,
  supervisorContractId,
  onComplete,
}: UseOfficerCascadeImportFlowOptions) {
  const router = useRouter()
  const [step, setStep] = React.useState<FlowStep>('select')
  const [isBusy, setIsBusy] = React.useState(false)
  const [selections, setSelections] = React.useState<CascadeImportSelection[]>(
    [],
  )
  const [importableCount, setImportableCount] = React.useState(0)
  const [aiEnabled, setAiEnabled] = React.useState(false)
  const [isLoadingAiStatus, setIsLoadingAiStatus] = React.useState(false)
  const [reviewMode, setReviewMode] = React.useState<'as-is' | 'ai'>('ai')
  const [previewItems, setPreviewItems] = React.useState<
    Awaited<ReturnType<typeof fetchOfficerCascadeRewritePreview>>['items']
  >([])
  const [drafts, setDrafts] = React.useState<
    Record<string, CascadeActivityRewrite>
  >({})
  const [importMode, setImportMode] =
    React.useState<OfficerCascadeImportModeChoice | null>(null)

  const resetFlow = React.useCallback(() => {
    setStep('select')
    setIsBusy(false)
    setSelections([])
    setImportableCount(0)
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
      importableCount: number
    }) => {
      setSelections(payload.selections)
      setImportableCount(payload.importableCount)
    },
    [],
  )

  const finishImport = React.useCallback(
    async (rewrites?: CascadeActivityRewrite[]) => {
      if (!officerContractId) {
        throw new Error('Officer contract is not ready yet')
      }

      const data = await runOfficerCascadeImport(
        officerContractId,
        selections,
        rewrites,
        supervisorContractId,
      )
      invalidateOfficerCascadeOptionsCache({
        sectionId,
        officerContractId,
        supervisorContractId,
      })
      const importedCount = Array.isArray(data.importedTaskKeys)
        ? data.importedTaskKeys.length
        : countOfficerImportableTasks(selections) || importableCount
      toast.success(
        `Cascaded ${importedCount} task${importedCount === 1 ? '' : 's'} from supervisor's contract`,
      )
      router.refresh()
      onComplete?.()
      resetFlow()
    },
    [
      officerContractId,
      supervisorContractId,
      selections,
      sectionId,
      importableCount,
      router,
      onComplete,
      resetFlow,
    ],
  )

  const openModeStep = React.useCallback(async () => {
    if (!officerContractId || importableCount === 0) {
      return
    }

    setStep('mode')
    setImportMode(null)
    setIsLoadingAiStatus(true)
    try {
      const preview = await fetchOfficerCascadeRewritePreview(
        officerContractId,
        selections,
        false,
        supervisorContractId,
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
  }, [officerContractId, supervisorContractId, importableCount, selections])

  const handleSelectSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (importableCount === 0) return
      void openModeStep()
    },
    [importableCount, openModeStep],
  )

  const handleChooseAsIs = React.useCallback(async () => {
    if (!officerContractId) return
    setIsBusy(true)
    try {
      await finishImport()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to import')
    } finally {
      setIsBusy(false)
    }
  }, [officerContractId, finishImport])

  const handleChooseAi = React.useCallback(async () => {
    if (!officerContractId || !aiEnabled) return
    setIsBusy(true)
    setReviewMode('ai')
    try {
      const preview = await fetchOfficerCascadeRewritePreview(
        officerContractId,
        selections,
        true,
        supervisorContractId,
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
  }, [officerContractId, supervisorContractId, aiEnabled, selections])

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
