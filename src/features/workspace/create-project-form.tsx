'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreateProjectFormProps {
  onCreated: () => void
}

export function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [isBusy, setIsBusy] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsBusy(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to create project',
        )
      }
      setName('')
      setIsOpen(false)
      onCreated()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsBusy(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm transition-colors sm:px-5'
      >
        <span className='flex size-8 items-center justify-center rounded-md bg-muted'>
          <Plus className='size-4' />
        </span>
        Create new project
      </button>
    )
  }

  return (
    <form
      onSubmit={e => void handleSubmit(e)}
      className='flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:px-5'
    >
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder='Project name'
        required
        autoFocus
        disabled={isBusy}
      />
      <div className='flex gap-2'>
        <Button type='submit' disabled={isBusy || !name.trim()}>
          {isBusy ? 'Creating…' : 'Create'}
        </Button>
        <Button
          type='button'
          variant='ghost'
          disabled={isBusy}
          onClick={() => {
            setIsOpen(false)
            setName('')
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
