import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function NotAuthorized({
  title = 'Not authorized',
  description = "You don't have access to this page.",
  hint,
}: {
  title?: string
  description?: string
  hint?: string
}) {
  return (
    <div className='mx-auto max-w-2xl p-6'>
      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-base'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'>
          {hint ? (
            <p className='text-sm text-muted-foreground'>{hint}</p>
          ) : null}
          <Button asChild variant='outline'>
            <Link href='/departments'>Go to app</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
