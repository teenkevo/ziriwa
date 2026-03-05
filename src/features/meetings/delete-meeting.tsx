'use client'

import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useActionState } from 'react'
import { deleteMeeting } from '@/lib/actions'
import type { Meeting } from '@/sanity/lib/meetings/get-all-meeting-minutes'

export function DeleteMeeting({
  meeting,
  onDeleted,
}: {
  meeting: Meeting
  onDeleted?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = !useIsMobile()
  const router = useRouter()

  const action = async (_: void | null) => {
    const result = await deleteMeeting(meeting)
    if (result.status === 'ok') {
      toast.success('Meeting has been deleted')
      setOpen(false)
      onDeleted?.()
      router.refresh()
    } else {
      toast.error('Something went wrong')
    }
  }

  const [, dispatch, isPending] = useActionState(action, null)

  const deleteButton = (
    <Button type='submit' variant='destructive' disabled={isPending}>
      {isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      Delete meeting
    </Button>
  )

  const description = (
    <>
      Are you sure you want to delete &ldquo;{meeting.title}&rdquo;? This action
      cannot be undone — the meeting and all its files (agenda, financials,
      minutes) will be permanently removed.
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant='destructive' size='sm'>
            Delete meeting
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Delete meeting</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form action={dispatch}>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {deleteButton}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='destructive' size='sm'>
          Delete meeting
        </Button>
      </DialogTrigger>
      <DrawerContent>
        <DrawerHeader className='text-left'>
          <DrawerTitle>Delete meeting</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <form action={dispatch}>
          <DrawerFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            {deleteButton}
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
