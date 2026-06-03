import type { LlmConfig } from '@/lib/ai/llm-config'

interface OpenAiChatJsonOptions<T> {
  config: LlmConfig
  system: string
  user: string
  parse: (value: unknown) => T
  temperature?: number
}

export async function openAiChatJson<T>({
  config,
  system,
  user,
  parse,
  temperature = 0.2,
}: OpenAiChatJsonOptions<T>): Promise<T> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
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
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM returned an empty response')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('LLM returned invalid JSON')
  }

  return parse(parsed)
}
