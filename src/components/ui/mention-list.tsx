'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { STAFF_ROLE_OPTIONS } from '@/lib/staff-roles'

export interface MentionPerson {
  id: string
  label: string
  staffId?: string
  role?: string
}

export interface MentionListProps {
  items: MentionPerson[]
  command: (item: MentionPerson) => void
}

function roleLabel(role?: string): string | undefined {
  if (!role) return undefined
  return STAFF_ROLE_OPTIONS.find(option => option.value === role)?.title ?? role
}

export const MentionList = React.forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  MentionListProps
>(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = React.useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return
      command(item)
    },
    [command, items],
  )

  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex(
          (selectedIndex + items.length - 1) % items.length,
        )
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % items.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  if (!items.length) {
    return (
      <div className='rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md'>
        No people found.
      </div>
    )
  }

  return (
    <div className='max-h-60 min-w-[220px] overflow-y-auto rounded-md border bg-popover p-1 shadow-md'>
      {items.map((item, index) => {
        const subtitle = [item.staffId, roleLabel(item.role)]
          .filter(Boolean)
          .join(' · ')

        return (
          <button
            key={item.id}
            type='button'
            className={cn(
              'flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/60',
            )}
            onMouseDown={event => event.preventDefault()}
            onClick={() => selectItem(index)}
          >
            <span className='font-medium'>{item.label}</span>
            {subtitle ? (
              <span className='text-xs text-muted-foreground'>{subtitle}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
})
