'use client'

import * as React from 'react'
import { useServerRefresh } from '@/hooks/use-server-refresh'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { mergeKeyedListOrder } from '@/lib/contract-numbering'
import { patchContractReorder } from '@/lib/patch-contract-reorder'
import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { EditObjectiveDialog } from '@/features/sections/components/edit-objective-dialog'
import { EditInitiativeDialog } from '@/features/sections/components/edit-initiative-dialog'
import {
  ContractColumnBrowser,
  contractInitiativeActivityHref,
  type ContractColumnInitiative,
  type ContractColumnObjective,
} from '@/features/sections/components/contract-column-browser'
import {
  contractFinalizeAttentionKeys,
  reviewContractForFinalize,
} from '@/lib/contract-finalize'
import { ContractFinalizeBar } from '@/features/sections/components/contract-finalize-bar'

interface ContractTreeProps {
  sectionContract: SectionContract
  sectionSlug?: string
  canManageContract?: boolean
  /** Increment to open the add SSMARTA objective dialog (from parent toolbar). */
  addObjectiveSignal?: number
  /** Call when the add-objective dialog closes so the parent can clear `addObjectiveSignal`. */
  onAddObjectiveRequestConsumed?: () => void
}

function buildSectionColumnObjectives(input: {
  sectionContract: SectionContract
  sectionSlug: string
  canManage: boolean
  onEditObjective: (objIdx: number) => void
  onDeleteObjective: (objIdx: number) => void
  onAddInitiative: (objIdx: number) => void
  onEditInitiative: (objIdx: number, initIdx: number) => void
  onDeleteInitiative: (objIdx: number, initIdx: number) => void
  onOpenInitiative: (objIdx: number, initIdx: number) => void
  onReorderInitiatives: (
    objectiveKey: string,
    orderedVisibleKeys: string[],
  ) => void | Promise<void>
}): ContractColumnObjective[] {
  const {
    sectionContract,
    sectionSlug,
    canManage,
    onEditObjective,
    onDeleteObjective,
    onAddInitiative,
    onEditInitiative,
    onDeleteInitiative,
    onOpenInitiative,
    onReorderInitiatives,
  } = input
  const objectives = sectionContract.objectives ?? []
  const attention = contractFinalizeAttentionKeys(
    reviewContractForFinalize(objectives, sectionContract.hiddenCascadeKeys),
  )
  const hidden = new Set(sectionContract.hiddenCascadeKeys ?? [])

  return objectives.flatMap((obj, objIdx) => {
    if (obj._key && hidden.has(obj._key)) return []
    const objNum = obj.code ?? String(objIdx + 1)
    const initiatives = obj.initiatives ?? []

    const canEditObjective = canManage && !isCascadedItem(obj)

    const objectiveId = obj._key || `objective-${objIdx}`
    const initiativeRows = initiatives.flatMap<ContractColumnInitiative>((init, initIdx) => {
        const initNum = init.code ?? `${objNum}.${initIdx + 1}`
        const initiativeId = init._key || `initiative-${objIdx}-${initIdx}`
        if (init._key && hidden.has(init._key)) return []
        const canEditInitiative = canManage && !isCascadedItem(init)

        return [{
          id: initiativeId,
          attention: attention.has(initiativeId),
          ready: !attention.has(initiativeId),
          title: init.title,
          code: initNum,
          onEdit: canEditInitiative
            ? () => onEditInitiative(objIdx, initIdx)
            : undefined,
          onDelete: canEditInitiative
            ? () => onDeleteInitiative(objIdx, initIdx)
            : undefined,
          onOpen: sectionSlug
            ? () => onOpenInitiative(objIdx, initIdx)
            : undefined,
        }]
    })
    if (initiatives.length > 0 && initiativeRows.length === 0) return []
    return [{
      id: objectiveId,
      attention: attention.has(objectiveId),
      ready: !attention.has(objectiveId),
      title: obj.title,
      code: objNum,
      onEdit: canEditObjective ? () => onEditObjective(objIdx) : undefined,
      onDelete: canEditObjective ? () => onDeleteObjective(objIdx) : undefined,
      onAddInitiative: canManage ? () => onAddInitiative(objIdx) : undefined,
      onReorderInitiatives:
        canManage && obj._key
          ? orderedIds => onReorderInitiatives(obj._key as string, orderedIds)
          : undefined,
      initiatives: initiativeRows,
    }]
  })
}

export function ContractTree({
  sectionContract,
  sectionSlug = '',
  canManageContract = false,
  addObjectiveSignal = 0,
  onAddObjectiveRequestConsumed,
}: ContractTreeProps) {
  const { router, refresh: refreshRouter } = useServerRefresh()
  const navigation = useWorkspaceRouteNavigationOptional()
  const openContractHref = React.useCallback(
    (href: string) => {
      if (navigation) {
        navigation.navigateToHref(href)
        return
      }
      router.push(href)
    },
    [navigation, router],
  )
  const [objectiveDialogOpen, setObjectiveDialogOpen] = React.useState(false)
  const [initiativeDialogOpen, setInitiativeDialogOpen] = React.useState(false)
  const [initiativeDialogObjIdx, setInitiativeDialogObjIdx] =
    React.useState<number>(0)
  const [editObjectiveOpen, setEditObjectiveOpen] = React.useState(false)
  const [editingObjectiveIndex, setEditingObjectiveIndex] =
    React.useState<number>(0)
  const [editInitiativeOpen, setEditInitiativeOpen] = React.useState(false)
  const [editingInitiative, setEditingInitiative] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)
  const [deleteObjectiveIndex, setDeleteObjectiveIndex] = React.useState<
    number | null
  >(null)
  const [deleteInitiative, setDeleteInitiative] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const objectives = sectionContract.objectives ?? []

  React.useEffect(() => {
    if (addObjectiveSignal === 0) return
    onAddObjectiveRequestConsumed?.()
  }, [addObjectiveSignal, onAddObjectiveRequestConsumed])

  const contractPatchUrl = `/api/section-contracts/${sectionContract._id}`
  const hiddenCascadeKeys = React.useMemo(
    () => new Set(sectionContract.hiddenCascadeKeys ?? []),
    [sectionContract.hiddenCascadeKeys],
  )

  const persistReorder = React.useCallback(
    async (op: string, payload: Record<string, unknown>) => {
      try {
        await patchContractReorder(contractPatchUrl, op, payload)
        await refreshRouter()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reorder')
        throw err
      }
    },
    [contractPatchUrl, router],
  )

  const handleReorderInitiatives = React.useCallback(
    async (objectiveKey: string, orderedVisibleKeys: string[]) => {
      const objective = (sectionContract.objectives ?? []).find(
        item => item._key === objectiveKey,
      )
      const orderedKeys = mergeKeyedListOrder(
        objective?.initiatives ?? [],
        orderedVisibleKeys,
        item => !hiddenCascadeKeys.has(item._key),
      )
      if (!orderedKeys) {
        toast.error('Failed to reorder')
        throw new Error('Failed to reorder')
      }
      await persistReorder('reorderInitiatives', {
        objectiveKey,
        orderedKeys,
      })
    },
    [hiddenCascadeKeys, persistReorder, sectionContract],
  )

  const handleReorderObjectives = React.useCallback(
    async (orderedVisibleKeys: string[]) => {
      const orderedKeys = mergeKeyedListOrder(
        sectionContract.objectives ?? [],
        orderedVisibleKeys,
        item => !hiddenCascadeKeys.has(item._key),
      )
      if (!orderedKeys) {
        toast.error('Failed to reorder')
        throw new Error('Failed to reorder')
      }
      await persistReorder('reorderObjectives', { orderedKeys })
    },
    [hiddenCascadeKeys, persistReorder, sectionContract],
  )

  const columnObjectives = React.useMemo(
    () =>
      buildSectionColumnObjectives({
        sectionContract,
        sectionSlug,
        canManage: canManageContract && sectionContract.status !== 'finalized',
        onEditObjective: objIdx => {
          setEditingObjectiveIndex(objIdx)
          setEditObjectiveOpen(true)
        },
        onDeleteObjective: setDeleteObjectiveIndex,
        onAddInitiative: objIdx => {
          setInitiativeDialogObjIdx(objIdx)
          setInitiativeDialogOpen(true)
        },
        onEditInitiative: (objIdx, initIdx) => {
          setEditingInitiative({ objIdx, initIdx })
          setEditInitiativeOpen(true)
        },
        onDeleteInitiative: (objIdx, initIdx) =>
          setDeleteInitiative({ objIdx, initIdx }),
        onOpenInitiative: (objIdx, initIdx) => {
          if (!sectionSlug) return
          openContractHref(
            `/sections/${sectionSlug}/initiative/${sectionContract._id}/${objIdx}/${initIdx}`,
          )
        },
        onReorderInitiatives: handleReorderInitiatives,
      }),
    [
      sectionContract,
      sectionSlug,
      canManageContract,
      openContractHref,
      handleReorderInitiatives,
    ],
  )

  const handleDeleteObjective = React.useCallback(async () => {
    if (deleteObjectiveIndex == null) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteObjective',
          payload: { objectiveIndex: deleteObjectiveIndex },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete objective')
      }
      setDeleteObjectiveIndex(null)
      toast.success('Objective deleted')
      await refreshRouter()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete objective',
      )
    } finally {
      setDeleting(false)
    }
  }, [deleteObjectiveIndex, router, sectionContract._id])

  const handleDeleteInitiative = React.useCallback(async () => {
    if (!deleteInitiative) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteInitiative',
          payload: {
            objectiveIndex: deleteInitiative.objIdx,
            initiativeIndex: deleteInitiative.initIdx,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete initiative')
      }
      setDeleteInitiative(null)
      toast.success('Initiative deleted')
      await refreshRouter()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete initiative',
      )
    } finally {
      setDeleting(false)
    }
  }, [deleteInitiative, router, sectionContract._id])

  return (
    <div className='space-y-4'>
      <AddObjectiveDialog
        open={objectiveDialogOpen}
        onOpenChange={open => {
          setObjectiveDialogOpen(open)
          if (!open) onAddObjectiveRequestConsumed?.()
        }}
        sectionContractId={sectionContract._id}
      />
      <EditObjectiveDialog
        open={editObjectiveOpen}
        onOpenChange={setEditObjectiveOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={editingObjectiveIndex}
        initialCode={objectives[editingObjectiveIndex]?.code ?? ''}
        initialTitle={objectives[editingObjectiveIndex]?.title ?? ''}
      />
      <EditInitiativeDialog
        open={editInitiativeOpen}
        onOpenChange={setEditInitiativeOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={editingInitiative?.objIdx ?? 0}
        initiativeIndex={editingInitiative?.initIdx ?? 0}
        objectiveCode={
          objectives[editingInitiative?.objIdx ?? 0]?.code ??
          String((editingInitiative?.objIdx ?? 0) + 1)
        }
        initialCode={
          objectives[editingInitiative?.objIdx ?? 0]?.initiatives?.[
            editingInitiative?.initIdx ?? 0
          ]?.code ?? ''
        }
        initialTitle={
          objectives[editingInitiative?.objIdx ?? 0]?.initiatives?.[
            editingInitiative?.initIdx ?? 0
          ]?.title ?? ''
        }
      />
      <AlertDialog
        open={deleteObjectiveIndex !== null}
        onOpenChange={open => !open && setDeleteObjectiveIndex(null)}
      >
        <AlertDialogContent disableClose={deleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete objective?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this SSMARTA objective and all of its
              initiatives and measurable activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                handleDeleteObjective()
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteInitiative !== null}
        onOpenChange={open => !open && setDeleteInitiative(null)}
      >
        <AlertDialogContent disableClose={deleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this initiative and all of its
              measurable activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                handleDeleteInitiative()
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddInitiativeDialog
        open={initiativeDialogOpen}
        onOpenChange={setInitiativeDialogOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={initiativeDialogObjIdx}
        objectiveCode={
          objectives[initiativeDialogObjIdx]?.code ??
          String(initiativeDialogObjIdx + 1)
        }
        nextOrder={
          (objectives[initiativeDialogObjIdx]?.initiatives?.length ?? 0) + 1
        }
      />
      <ContractFinalizeBar
        contractId={sectionContract._id}
        status={sectionContract.status}
        canFinalize={canManageContract}
        objectives={sectionContract.objectives}
        holdMessage={sectionContract.cascadeHoldMessage}
        hiddenKeys={sectionContract.hiddenCascadeKeys}
        issueHref={issue => {
          if (
            !sectionSlug ||
            issue.objectiveIndex < 0 ||
            issue.initiativeIndex == null
          ) {
            return undefined
          }
          return contractInitiativeActivityHref({
            sectionSlug,
            contractId: sectionContract._id,
            objectiveIndex: issue.objectiveIndex,
            initiativeIndex: issue.initiativeIndex,
            activityKey: issue.activityKey,
          })
        }}
      />
      <ContractColumnBrowser
        objectives={columnObjectives}
        onReorderObjectives={
          canManageContract && sectionContract.status !== 'finalized'
            ? handleReorderObjectives
            : undefined
        }
        emptyObjectivesMessage={
          sectionContract.cascadeHoldMessage || undefined
        }
      />
    </div>
  )
}
