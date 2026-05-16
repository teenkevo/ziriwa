'use client'

import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import {
  MembersTable,
  type AppMemberRow,
  type DepartmentOption,
  type PendingInviteRow,
} from '@/components/admin/members-table'
import { Card, CardContent } from '@/components/ui/card'

interface UserManagementPageProps {
  members: AppMemberRow[]
  departments: DepartmentOption[]
  pendingInvites: PendingInviteRow[]
}

export function UserManagementPage({
  members,
  departments,
  pendingInvites,
}: UserManagementPageProps) {
  useRegisterPageBreadcrumbs([
    { label: 'Departments', href: '/departments' },
    { label: 'User management' },
  ])

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-auto'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            User Management
          </h1>
          <p className='text-sm text-muted-foreground'>
            Onboard users, and assign them roles in the application.
          </p>
        </div>

        <Card>
          <CardContent className='pt-6'>
            <MembersTable
              members={members}
              departments={departments}
              pendingInvites={pendingInvites}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
