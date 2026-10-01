'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface EvidenceChip {
  _key: string
  label: string
  notes: string
}

interface ExpectedEvidenceInputProps {
  items: EvidenceChip[]
  onChange: (items: EvidenceChip[]) => void
  pending: string
  onPendingChange: (value: string) => void
  disabled?: boolean
  id?: string
}

/** Chip field for expected evidence. Type an item and press Enter. */
export function ExpectedEvidenceInput({
  items,
  onChange,
  pending,
  onPendingChange,
  disabled = false,
  id,
}: ExpectedEvidenceInputProps) {
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [editingLabel, setEditingLabel] = React.useState('')
  const skipCommitRef = React.useRef(false)

  function addItem() {
    const label = pending.trim()
    if (!label || disabled) return
    onChange([...items, { _key: crypto.randomUUID(), label, notes: '' }])
    onPendingChange('')
  }

  function removeItem(key: string) {
    if (editingKey === key) {
      setEditingKey(null)
      setEditingLabel('')
    }
    onChange(items.filter(item => item._key !== key))
  }

  function commitEdit() {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      return
    }
    if (!editingKey) return
    const label = editingLabel.trim()
    const key = editingKey
    setEditingKey(null)
    setEditingLabel('')
    if (!label) return
    onChange(items.map(item => (item._key === key ? { ...item, label } : item)))
  }

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5',
        !disabled && 'focus-within:ring-1 focus-within:ring-ring',
      )}
    >
      {items.map(item =>
        item._key === editingKey ? (
          <input
            key={item._key}
            autoFocus
            value={editingLabel}
            disabled={disabled}
            aria-label={`Edit ${item.label}`}
            onChange={event => setEditingLabel(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                skipCommitRef.current = true
                setEditingKey(null)
                setEditingLabel('')
              }
            }}
            style={{ width: `${Math.max(editingLabel.length, 4) + 2}ch` }}
            className='h-6 max-w-full rounded-md border bg-background px-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed'
          />
        ) : (
          <span
            key={item._key}
            className='inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground'
          >
            <button
              type='button'
              className='max-w-[16rem] truncate text-left'
              disabled={disabled}
              onClick={() => {
                if (disabled) return
                setEditingKey(item._key)
                setEditingLabel(item.label)
              }}
            >
              {item.label}
            </button>
            <button
              type='button'
              className='shrink-0 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50'
              aria-label={`Remove ${item.label}`}
              disabled={disabled}
              onMouseDown={event => event.preventDefault()}
              onClick={() => removeItem(item._key)}
            >
              <X className='h-3 w-3' />
            </button>
          </span>
        ),
      )}
      <input
        id={id}
        value={pending}
        disabled={disabled}
        onChange={event => onPendingChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addItem()
            return
          }
          if (event.key === 'Backspace' && pending.length === 0 && items.length > 0) {
            event.preventDefault()
            removeItem(items[items.length - 1]._key)
          }
        }}
        placeholder={items.length === 0 ? 'Type an item and press Enter' : 'Add another'}
        className='h-7 min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
      />
    </div>
  )
}

export function evidenceChipsForSubmit(
  items: EvidenceChip[],
  pending: string,
): EvidenceChip[] {
  const label = pending.trim()
  if (!label) return items
  return [...items, { _key: crypto.randomUUID(), label, notes: '' }]
}
