'use client'

import * as React from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { WorkContextMode } from '@/lib/section-access'
import { SECTION_ASK_AI_SUGGESTED_PROMPTS } from '@/lib/section-ai/section-ask-ai-prompts'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SectionAskAiSheetProps {
  sectionId: string
  sectionName: string
  workContext?: WorkContextMode
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function SectionAskAiSheet({
  sectionId,
  sectionName,
  workContext = 'own',
}: SectionAskAiSheetProps) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false)
  const [aiEnabled, setAiEnabled] = React.useState<boolean | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const suggestedPrompts = SECTION_ASK_AI_SUGGESTED_PROMPTS

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setIsCheckingStatus(true)
    setError(null)

    const params = new URLSearchParams()
    if (workContext) params.set('workContext', workContext)

    fetch(`/api/sections/${sectionId}/ask-ai?${params.toString()}`)
      .then(async response => {
        const payload = (await response.json()) as {
          aiEnabled?: boolean
          error?: string
        }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load Ask AI')
        }
        if (!cancelled) setAiEnabled(payload.aiEnabled === true)
      })
      .catch(loadError => {
        if (!cancelled) {
          setAiEnabled(false)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load Ask AI',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingStatus(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, sectionId, workContext])

  React.useEffect(() => {
    if (!open) return
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isLoading, open])

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isLoading || aiEnabled === false) return

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/sections/${sectionId}/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(message => ({
            role: message.role,
            content: message.content,
          })),
          workContext,
        }),
      })

      const payload = (await response.json()) as {
        message?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to get a response')
      }

      if (!payload.message?.trim()) {
        throw new Error('AI returned an empty response')
      }

      setMessages(current => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: payload.message!.trim(),
        },
      ])
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Failed to get a response',
      )
      setMessages(current => current.filter(message => message.id !== userMessage.id))
      setInput(trimmed)
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    void sendMessage(input)
  }

  const showSuggestions = messages.length === 0 && !isLoading

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type='button' variant='outline' size='sm' className='gap-2'>
          <Sparkles className='h-4 w-4' />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent className='flex w-full flex-col sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4' />
            Ask AI
          </SheetTitle>
          <SheetDescription>
            Ask questions about {sectionName}. Answers use your section contract,
            sprints, and stakeholder data.
          </SheetDescription>
        </SheetHeader>

        <div className='mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
          {isCheckingStatus ? (
            <div className='flex flex-1 items-center justify-center'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : aiEnabled === false ? (
            <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
              AI is not configured on this server. Set{' '}
              <code className='text-xs'>OPENAI_API_KEY</code> to enable Ask AI.
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className='min-h-0 flex-1 overflow-y-auto pr-1'
              >
                <div className='space-y-4 pb-2'>
                  {showSuggestions ? (
                    <div className='space-y-3'>
                      <p className='text-sm text-muted-foreground'>
                        Try one of these prompts:
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {suggestedPrompts.map(prompt => (
                          <button
                            key={prompt}
                            type='button'
                            disabled={isLoading}
                            onClick={() => void sendMessage(prompt)}
                            className='rounded-full border bg-muted/40 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50'
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        'max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'mr-auto bg-muted',
                      )}
                    >
                      {message.content}
                    </div>
                  ))}

                  {isLoading ? (
                    <div className='mr-auto inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Thinking…
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? (
                <p className='text-sm text-destructive' role='alert'>
                  {error}
                </p>
              ) : null}

              <form onSubmit={handleSubmit} className='flex items-end gap-2'>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  placeholder='Ask about sprints, stakeholders, contract risk…'
                  rows={2}
                  disabled={isLoading}
                  className='min-h-[72px] resize-none'
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                />
                <Button
                  type='submit'
                  size='icon'
                  disabled={isLoading || !input.trim()}
                  aria-label='Send message'
                >
                  {isLoading ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Send className='h-4 w-4' />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
