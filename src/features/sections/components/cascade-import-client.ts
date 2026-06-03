import type {
  CascadeActivityRewrite,
  CascadeImportSelection,
  CascadeRewritePreviewResponse,
} from '@/lib/contract-cascade/types'

export async function fetchCascadeRewritePreview(
  supervisorContractId: string,
  selections: CascadeImportSelection[],
  generateAi: boolean,
): Promise<CascadeRewritePreviewResponse> {
  const res = await fetch(
    `/api/supervisor-contracts/${supervisorContractId}/cascade-rewrite-preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections, generateAi }),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load cascade preview')
  }
  return data as CascadeRewritePreviewResponse
}

export async function runCascadeImport(
  supervisorContractId: string,
  selections: CascadeImportSelection[],
  rewrites?: CascadeActivityRewrite[],
) {
  const res = await fetch(
    `/api/supervisor-contracts/${supervisorContractId}/cascade-import`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selections,
        ...(rewrites ? { rewrites } : {}),
      }),
    },
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to import cascaded items')
  }
  return data as { importedActivityKeys?: string[] }
}

export function buildRewriteDraftsFromPreview(
  preview: CascadeRewritePreviewResponse,
  mode: 'as-is' | 'ai',
) {
  const drafts: Record<string, CascadeActivityRewrite> = {}

  for (const item of preview.items) {
    const source =
      mode === 'ai' && item.aiSuggested
        ? item.aiSuggested
        : {
            activityKey: item.activityKey,
            initiativeKey: item.initiativeKey,
            objectiveTitle: item.asIs.objectiveTitle,
            initiativeTitle: item.asIs.initiativeTitle,
            measurableTitle: item.asIs.measurableTitle,
            tasks: item.asIs.tasks,
          }

    drafts[item.activityKey] = { ...source }
  }

  return drafts
}

export function draftsToRewritePayload(
  drafts: Record<string, CascadeActivityRewrite>,
) {
  return Object.values(drafts)
}

export function syncObjectiveAcrossInitiative(
  drafts: Record<string, CascadeActivityRewrite>,
  initiativeKey: string,
  objectiveTitle: string,
) {
  const next = { ...drafts }
  for (const draft of Object.values(next)) {
    if (draft.initiativeKey === initiativeKey) {
      next[draft.activityKey] = { ...draft, objectiveTitle }
    }
  }
  return next
}
