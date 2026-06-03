export interface LlmConfig {
  enabled: true
  apiKey: string
  model: string
  baseUrl: string
}

export interface LlmDisabled {
  enabled: false
}

export type LlmRuntimeConfig = LlmConfig | LlmDisabled

export function getLlmConfig(): LlmRuntimeConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return { enabled: false }

  return {
    enabled: true,
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
  }
}

export function llmUnavailableMessage() {
  return 'AI rewrite is not configured. Set OPENAI_API_KEY on the server to enable it.'
}
