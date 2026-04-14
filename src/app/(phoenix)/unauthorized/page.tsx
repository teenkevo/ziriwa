import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
            <AlertCircle className='h-8 w-8 text-destructive' />
          </div>
          <CardTitle className='text-2xl'>Unauthorized Access</CardTitle>
          <CardDescription className='mt-2'>
            Your email address is not registered as staff in this system. Please
            contact the administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col gap-2'>
            <Button asChild>
              <Link href='/'>Return to Homepage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
