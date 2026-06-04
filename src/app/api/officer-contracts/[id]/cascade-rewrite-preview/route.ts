import { NextRequest, NextResponse } from 'next/server'

import { getLlmConfig } from '@/lib/ai/llm-config'
import { normalizeOfficerCascadeSelections } from '@/lib/contract-cascade/officer-cascade-selection'
import { generateOfficerCascadeRewrites } from '@/lib/contract-cascade/generate-officer-cascade-rewrites'
import {
  OfficerCascadeImportContextError,
  loadOfficerCascadeImportContext,
} from '@/lib/contract-cascade/load-officer-cascade-import-context.server'
import { buildRewritePreviewItems } from '@/lib/contract-cascade/validate-cascade-rewrite'

/**
 * POST /api/officer-contracts/[id]/cascade-rewrite-preview
 * Body: { selections, generateAi?: boolean, supervisorContractId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: officerContractId } = await params
    const body = await req.json()
    const selections = normalizeOfficerCascadeSelections(body.selections)
    const generateAi = body.generateAi !== false

    if (!selections) {
      return NextResponse.json(
        {
          error:
            'selections is required: array of { initiativeKey, activities: [{ activityKey, taskKeys }] }',
        },
        { status: 400 },
      )
    }

    const context = await loadOfficerCascadeImportContext(
      officerContractId,
      selections,
      typeof body.supervisorContractId === 'string'
        ? body.supervisorContractId
        : null,
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
      aiSuggested = await generateOfficerCascadeRewrites(context.rewriteContexts)
    }

    return NextResponse.json({
      aiEnabled,
      items: buildRewritePreviewItems(context.rewriteContexts, aiSuggested),
    })
  } catch (error) {
    if (error instanceof OfficerCascadeImportContextError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }
    console.error('Error generating officer cascade rewrite preview', error)
    return NextResponse.json(
      { error: 'Failed to generate cascade rewrite preview' },
      { status: 500 },
    )
  }
}
