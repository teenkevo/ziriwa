'use client'

import { LayoutGrid, Table2 } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ViewMode } from '@/hooks/use-view-mode'

export function ViewModeToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}) {
  return (
    <div className={className}>
      <span className='sr-only'>View</span>
      <ToggleGroup
        type='single'
        variant='outline'
        size='sm'
        value={value}
        onValueChange={v => {
          if (v === 'grid' || v === 'table') onChange(v)
        }}
        aria-label='Switch between grid and table layout'
      >
        <ToggleGroupItem value='grid' aria-label='Grid view'>
          <LayoutGrid className='h-4 w-4' />
        </ToggleGroupItem>
        <ToggleGroupItem value='table' aria-label='Table view'>
          <Table2 className='h-4 w-4' />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
