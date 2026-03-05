import React from 'react'

interface VerticalDividerProps {
  height?: string
  color?: string
  className?: string
}

export function VerticalDivider({
  height = 'h-6',
  color = 'bg-muted-foreground',
  className = '',
}: VerticalDividerProps = {}) {
  return (
    <div
      className={`w-px ${height} ${color} ${className}`}
      role='separator'
      aria-orientation='vertical'
    />
  )
}
