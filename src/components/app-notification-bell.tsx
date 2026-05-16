'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { isVirtualNotificationId } from '@/lib/notifications/virtual-notification'
import type { AppNotificationRow } from '@/lib/notifications/types'
import { cn } from '@/lib/utils'

export function AppNotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<AppNotificationRow[]>(
    [],
  )
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = (await res.json()) as {
        notifications: AppNotificationRow[]
        unreadCount: number
      }
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  async function markRead(id: string, href?: string) {
    if (!isVirtualNotificationId(id)) {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
    }
    setNotifications(prev =>
      prev.map(n =>
        n._id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    )
    setUnreadCount(c => Math.max(0, c - 1))
    if (href) router.push(href)
  }

  return (
    <DropdownMenu onOpenChange={open => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative h-9 w-9'>
          <Bell className='h-4 w-4' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] font-medium'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className='sr-only'>Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80'>
        <DropdownMenuLabel className='flex items-center justify-between'>
          Notifications
          {isLoading && (
            <span className='text-xs font-normal text-muted-foreground'>
              Updating…
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className='px-2 py-4 text-sm text-muted-foreground'>
            No notifications yet.
          </p>
        ) : (
          notifications.map(n => (
            <DropdownMenuItem
              key={n._id}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-0.5 py-2',
                !n.readAt && 'bg-muted/50',
              )}
              onSelect={() => {
                void markRead(n._id, n.href)
              }}
            >
              <span className='text-sm font-medium leading-snug'>{n.title}</span>
              {n.body && (
                <span className='text-xs text-muted-foreground line-clamp-2'>
                  {n.body}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
