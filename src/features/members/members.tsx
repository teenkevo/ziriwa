'use client'
import { columns } from './components/columns'
import { DataTable } from './components/data-table'
import { ALL_MEMBERS_QUERYResult } from '../../../sanity.types'
import { Button } from '@/components/ui/button'
import { sendPaymentsToSanity } from '@/lib/actions'

export default function MembersPage({
  members,
}: {
  members: ALL_MEMBERS_QUERYResult
}) {
  return (
    <div className='flex-col md:flex'>
      <div className=' h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex'>
        <DataTable data={members} columns={columns} />
        {/* <Button onClick={() => sendPaymentsToSanity()}>
          Send Data to Sanity
        </Button> */}
      </div>
    </div>
  )
}
