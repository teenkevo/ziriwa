import { z } from 'zod'

import type { CascadeActivityRewrite, CascadeRewriteContextItem } from './types'

const IMPERATIVE_VERBS =
  /^(Submit|Prepare|Complete|Coordinate|Document|Deliver|Implement|Conduct|Facilitate|Develop|Finalize)\b/

const KPI_NOUN_PHRASE =
  /^(Identification|Development|Completion|Prioritization|Implementation|Delivery|Establishment|Documentation) of\b/i

export function validateCascadeRewrite(
  rewrite: CascadeActivityRewrite,
): string[] {
  const warnings: string[] = []

  if (!rewrite.objectiveTitle.startsWith('Achieve')) {
    warnings.push('Objective should start with "Achieve".')
  }
  if (!IMPERATIVE_VERBS.test(rewrite.initiativeTitle)) {
    warnings.push(
      'Initiative should start with an action verb such as Submit, Prepare, or Complete.',
    )
  }
  if (!KPI_NOUN_PHRASE.test(rewrite.measurableTitle)) {
    warnings.push(
      'KPI should be a noun phrase such as "Identification of…" or "Development of…".',
    )
  }

  const normalized = [
    rewrite.objectiveTitle.toLowerCase(),
    rewrite.initiativeTitle.toLowerCase(),
    rewrite.measurableTitle.toLowerCase(),
  ]
  if (new Set(normalized).size !== normalized.length) {
    warnings.push('Objective, initiative, and KPI should not repeat the same text.')
  }

  return warnings
}

const rewriteItemSchema = z.object({
  activityKey: z.string().min(1),
  objectiveTitle: z.string().min(1),
  initiativeTitle: z.string().min(1),
  measurableTitle: z.string().min(1),
  tasks: z.array(z.string()),
})

const rewriteResponseSchema = z.object({
  rewrites: z.array(rewriteItemSchema),
})

export function parseCascadeRewriteResponse(
  value: unknown,
  contexts: CascadeRewriteContextItem[],
): CascadeActivityRewrite[] {
  const parsed = rewriteResponseSchema.parse(value)
  const byKey = new Map(contexts.map(item => [item.activityKey, item]))

  return parsed.rewrites.map(item => {
    const context = byKey.get(item.activityKey)
    if (!context) {
      throw new Error(`Unexpected activityKey in LLM response: ${item.activityKey}`)
    }

    return {
      activityKey: item.activityKey,
      initiativeKey: context.initiativeKey,
      objectiveTitle: item.objectiveTitle.trim(),
      initiativeTitle: item.initiativeTitle.trim(),
      measurableTitle: item.measurableTitle.trim(),
      tasks: item.tasks.map(task => task.trim()).filter(Boolean),
    }
  })
}

export function rewritesCoverAllContexts(
  rewrites: CascadeActivityRewrite[],
  contexts: CascadeRewriteContextItem[],
) {
  if (rewrites.length !== contexts.length) return false
  const keys = new Set(rewrites.map(item => item.activityKey))
  return contexts.every(item => keys.has(item.activityKey))
}

export function buildRewritePreviewItems(
  contexts: CascadeRewriteContextItem[],
  aiSuggested?: CascadeActivityRewrite[],
): Array<
  CascadeRewriteContextItem & {
    aiSuggested?: CascadeActivityRewrite
    validationWarnings: string[]
  }
> {
  const byKey = new Map(aiSuggested?.map(item => [item.activityKey, item]))

  return contexts.map(context => {
    const suggested = byKey.get(context.activityKey)
    return {
      ...context,
      aiSuggested: suggested,
      validationWarnings: suggested ? validateCascadeRewrite(suggested) : [],
    }
  })
}
