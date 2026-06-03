import { openAiChatJson } from '@/lib/ai/openai-chat-json'
import { getLlmConfig, llmUnavailableMessage } from '@/lib/ai/llm-config'
import {
  buildCascadeRewriteUserPrompt,
  CASCADE_REWRITE_SYSTEM_PROMPT,
} from '@/lib/contract-cascade/cascade-rewrite-prompt'
import type { CascadeActivityRewrite, CascadeRewriteContextItem } from '@/lib/contract-cascade/types'
import {
  parseCascadeRewriteResponse,
  rewritesCoverAllContexts,
} from '@/lib/contract-cascade/validate-cascade-rewrite'

export async function generateCascadeRewrites(
  contexts: CascadeRewriteContextItem[],
): Promise<CascadeActivityRewrite[]> {
  const config = getLlmConfig()
  if (!config.enabled) {
    throw new Error(llmUnavailableMessage())
  }
  if (contexts.length === 0) return []

  const parsed = await openAiChatJson({
    config,
    system: CASCADE_REWRITE_SYSTEM_PROMPT,
    user: buildCascadeRewriteUserPrompt(contexts),
    parse: value => parseCascadeRewriteResponse(value, contexts),
  })

  if (!rewritesCoverAllContexts(parsed, contexts)) {
    throw new Error('AI rewrite did not cover all selected KPIs')
  }

  return parsed
}
