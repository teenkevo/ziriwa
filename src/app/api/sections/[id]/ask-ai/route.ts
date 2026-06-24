import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { openAiChat, type ChatMessage } from '@/lib/ai/openai-chat'
import { getLlmConfig, llmUnavailableMessage } from '@/lib/ai/llm-config'
import { assertAuth } from '@/lib/authz/guards.server'
import type { WorkContextMode } from '@/lib/section-access'
import {
  assertSectionAskAiAllowed,
  getSectionAccessForViewer,
} from '@/lib/section-access.server'
import { loadSectionAskAiContext } from '@/lib/section-ai/build-section-ai-context.server'
import {
  SECTION_ASK_AI_SUGGESTED_PROMPTS,
  SECTION_ASK_AI_SYSTEM_PROMPT,
} from '@/lib/section-ai/section-ask-ai-prompts'

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_MESSAGES = 20

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})

const postBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_HISTORY_MESSAGES),
  workContext: z.enum(['own', 'acting']).optional(),
})

function parseWorkContext(
  value: string | null,
): WorkContextMode | undefined {
  if (value === 'own' || value === 'acting') return value
  return undefined
}

async function authorizeSectionAskAi(
  sectionId: string,
  workContext?: WorkContextMode,
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const access = await getSectionAccessForViewer(sectionId, workContext ?? 'own')
  const denied = assertSectionAskAiAllowed(access)
  if (denied) return denied

  return { access }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sectionId } = await params
    const workContext = parseWorkContext(
      req.nextUrl.searchParams.get('workContext'),
    )
    const auth = await authorizeSectionAskAi(sectionId, workContext)
    if (auth instanceof NextResponse) return auth

    const llmConfig = getLlmConfig()
    return NextResponse.json({
      aiEnabled: llmConfig.enabled,
      suggestedPrompts: SECTION_ASK_AI_SUGGESTED_PROMPTS,
    })
  } catch (error) {
    console.error('GET /api/sections/[id]/ask-ai failed:', error)
    return NextResponse.json(
      { error: 'Failed to load Ask AI status' },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sectionId } = await params
    const body = postBodySchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const auth = await authorizeSectionAskAi(
      sectionId,
      body.data.workContext,
    )
    if (auth instanceof NextResponse) return auth

    const llmConfig = getLlmConfig()
    if (!llmConfig.enabled) {
      return NextResponse.json(
        { error: llmUnavailableMessage(), aiEnabled: false },
        { status: 503 },
      )
    }

    const context = await loadSectionAskAiContext(sectionId)
    if (!context) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const latestUserMessage = [...body.data.messages]
      .reverse()
      .find(message => message.role === 'user')
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: 'At least one user message is required' },
        { status: 400 },
      )
    }

    const history = body.data.messages.slice(-MAX_HISTORY_MESSAGES)
    const contextBlock = JSON.stringify(context, null, 2)
    const userPrompt = `Section data (JSON):
${contextBlock}

Manager question:
${latestUserMessage.content}`

    const priorMessages: ChatMessage[] = history
      .slice(0, -1)
      .map(message => ({
        role: message.role,
        content: message.content,
      }))

    const answer = await openAiChat({
      config: llmConfig,
      messages: [
        { role: 'system', content: SECTION_ASK_AI_SYSTEM_PROMPT },
        ...priorMessages,
        { role: 'user', content: userPrompt },
      ],
    })

    return NextResponse.json({ message: answer, aiEnabled: true })
  } catch (error) {
    console.error('POST /api/sections/[id]/ask-ai failed:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to generate a response'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
