import Link from 'next/link'
import { Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { isUserAdmin } from '@/lib/authz/guards.server'

export async function AdminNavLink() {
  const show = await isUserAdmin()
  if (!show) return null

  return (
    <Button asChild variant='ghost' size='sm' className='hidden sm:inline-flex'>
      <Link href='/admin/users'>
        <Users className='mr-1.5 size-4' />
        Users
      </Link>
    </Button>
  )
}
