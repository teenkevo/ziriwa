import { NextRequest, NextResponse } from 'next/server'

import { getLlmConfig } from '@/lib/ai/llm-config'
import { normalizeCascadeSelections } from '@/lib/contract-cascade/extract-cascade-context'
import { generateCascadeRewrites } from '@/lib/contract-cascade/generate-cascade-rewrites'
import {
  CascadeImportContextError,
  loadCascadeImportContext,
} from '@/lib/contract-cascade/load-cascade-import-context.server'
import { buildRewritePreviewItems } from '@/lib/contract-cascade/validate-cascade-rewrite'

/**
 * POST /api/supervisor-contracts/[id]/cascade-rewrite-preview
 * Body: { selections, generateAi?: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: supervisorContractId } = await params
    const body = await req.json()
    const selections = normalizeCascadeSelections(body.selections)
    const generateAi = body.generateAi !== false

    if (!selections) {
      return NextResponse.json(
        {
          error:
            'selections is required: array of { initiativeKey, activityKeys }',
        },
        { status: 400 },
      )
    }

    const context = await loadCascadeImportContext(
      supervisorContractId,
      selections,
    )
    const llmConfig = getLlmConfig()
    const aiEnabled = llmConfig.enabled

    let aiSuggested
    if (generateAi) {
      if (!aiEnabled) {
        return NextResponse.json(
          {
            error:
              'AI rewrite is not configured. Set OPENAI_API_KEY on the server to enable it.',
            aiEnabled: false,
          },
          { status: 503 },
        )
      }
      aiSuggested = await generateCascadeRewrites(context.rewriteContexts)
    }

    return NextResponse.json({
      aiEnabled,
      items: buildRewritePreviewItems(context.rewriteContexts, aiSuggested),
    })
  } catch (error) {
    if (error instanceof CascadeImportContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error generating cascade rewrite preview', error)
    return NextResponse.json(
      { error: 'Failed to generate cascade rewrite preview' },
      { status: 500 },
    )
  }
}
