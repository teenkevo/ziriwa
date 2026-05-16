'use client'

import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DelegationAuditTableProps {
  history: SectionStaffRoster['delegationHistory']
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  scheduled: 'secondary',
  completed: 'outline',
  cancelled: 'destructive',
}

export function DelegationAuditTable({ history }: DelegationAuditTableProps) {
  if (history.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        No delegation or acting-period records for this section yet.
      </p>
    )
  }

  return (
    <div className='rounded-md border overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acting staff</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Covering for</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recorded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map(row => (
            <TableRow key={row._id}>
              <TableCell className='font-medium'>
                {row.toStaff.fullName}
              </TableCell>
              <TableCell className='capitalize'>{row.actingRole}</TableCell>
              <TableCell>{row.fromStaff.fullName}</TableCell>
              <TableCell className='whitespace-nowrap text-sm'>
                {row.startDate} – {row.endDate}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className='text-muted-foreground text-sm whitespace-nowrap'>
                {new Date(row.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
