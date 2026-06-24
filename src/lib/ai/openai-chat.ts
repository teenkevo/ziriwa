import type { LlmConfig } from '@/lib/ai/llm-config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAiChatOptions {
  config: LlmConfig
  messages: ChatMessage[]
  temperature?: number
}

export async function openAiChat({
  config,
  messages,
  temperature = 0.3,
}: OpenAiChatOptions): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      messages,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail
        ? `LLM request failed (${response.status}): ${detail.slice(0, 240)}`
        : `LLM request failed (${response.status})`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('LLM returned an empty response')
  return content
}
