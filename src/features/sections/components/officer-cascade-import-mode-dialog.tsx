'use client'

import * as React from 'react'
import { Copy, Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type OfficerCascadeImportModeChoice = 'as-is' | 'ai'

interface OfficerCascadeImportModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  importableCount: number
  aiEnabled: boolean
  selectedMode: OfficerCascadeImportModeChoice | null
  onSelectMode: (mode: OfficerCascadeImportModeChoice) => void
  isLoadingAiStatus?: boolean
  isSubmitting?: boolean
  onBack: () => void
  onFinish: () => void
}

export function OfficerCascadeImportModeDialog({
  open,
  onOpenChange,
  importableCount,
  aiEnabled,
  selectedMode,
  onSelectMode,
  isLoadingAiStatus = false,
  isSubmitting = false,
  onBack,
  onFinish,
}: OfficerCascadeImportModeDialogProps) {
  const canFinishAsIs = selectedMode === 'as-is'
  const canFinishWithAi =
    selectedMode === 'ai' && !isLoadingAiStatus && aiEnabled
  const canFinish = canFinishAsIs || canFinishWithAi

  const finishHint = (() => {
    if (isSubmitting) return null
    if (!selectedMode) {
      return 'Select an import option to continue.'
    }
    if (selectedMode === 'ai' && isLoadingAiStatus) {
      return 'Checking whether AI rewrite is available…'
    }
    if (selectedMode === 'ai' && !aiEnabled) {
      return 'AI rewrite is not available. Choose Import as-is or configure OPENAI_API_KEY.'
    }
    return null
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            Import {importableCount} task{importableCount === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Choose how the selected supervisor tasks should appear on your
            officer contract, then select Finish.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 py-2'>
          <button
            type='button'
            onClick={() => onSelectMode('as-is')}
            disabled={isSubmitting}
            aria-pressed={selectedMode === 'as-is'}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              'hover:border-primary hover:bg-muted/40',
              selectedMode === 'as-is' &&
                'border-primary bg-muted/50 ring-1 ring-primary',
            )}
          >
            <div className='flex items-start gap-3'>
              <Copy className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
              <div className='space-y-1'>
                <p className='text-sm font-medium'>Import as-is</p>
                <p className='text-sm text-muted-foreground'>
                  Copy supervisor wording directly using the standard cascade
                  mapping.
                </p>
              </div>
            </div>
          </button>

          <button
            type='button'
            onClick={() => onSelectMode('ai')}
            disabled={!aiEnabled || isLoadingAiStatus || isSubmitting}
            aria-pressed={selectedMode === 'ai'}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              aiEnabled && !isLoadingAiStatus && !isSubmitting
                ? 'hover:border-primary hover:bg-muted/40'
                : 'cursor-not-allowed opacity-60',
              selectedMode === 'ai' &&
                aiEnabled &&
                !isLoadingAiStatus &&
                'border-primary bg-muted/50 ring-1 ring-primary',
            )}
          >
            <div className='flex items-start gap-3'>
              {isLoadingAiStatus ? (
                <Loader2 className='mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground' />
              ) : (
                <Sparkles className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
              )}
              <div className='space-y-1'>
                <p className='text-sm font-medium'>Rewrite with AI</p>
                <p className='text-sm text-muted-foreground'>
                  Generate officer-appropriate wording, then review and edit
                  before importing.
                </p>
                {isLoadingAiStatus ? (
                  <p className='text-xs text-muted-foreground'>
                    Checking availability…
                  </p>
                ) : null}
                {!isLoadingAiStatus && !aiEnabled ? (
                  <p className='text-xs text-amber-700'>Coming soon.</p>
                ) : null}
              </div>
            </div>
          </button>
        </div>

        {finishHint ? (
          <p className='text-xs text-muted-foreground'>{finishHint}</p>
        ) : null}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type='button'
            onClick={onFinish}
            disabled={!canFinish || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {selectedMode === 'ai' ? 'Generating…' : 'Importing…'}
              </>
            ) : (
              'Finish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
