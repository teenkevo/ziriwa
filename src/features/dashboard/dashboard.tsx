'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ALL_MEMBERS_QUERYResult } from '../../../sanity.types'
import { CreateDepartmentDialog } from './components/create-department-dialog'
import { CreateDivisionDialog } from './components/create-division-dialog'

type DivisionItem = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  sectionCount?: number
}

type Department = {
  _id: string
  name: string
  fullName?: string
} | null

type ACStaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

type CommissionerMember = {
  _id: string
  fullName: string
  staffId?: string
}

export default function DashboardPage({
  members,
  divisions = [],
  department,
  assistantCommissioners = [],
  commissioners = [],
}: {
  members: ALL_MEMBERS_QUERYResult
  divisions?: DivisionItem[]
  department?: Department
  assistantCommissioners?: ACStaffMember[]
  commissioners?: CommissionerMember[]
}) {
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [showCreateDepartment, setShowCreateDepartment] = useState(false)

  const canCreateDivision = !!department
  const needsDepartment = !department
  const departmentName = department?.name ?? 'the current department'

  return (
    <div className='flex-col md:flex'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <div className='flex items-center justify-between'>
          <div>
            {department && (
              <p className='font-bold'>
                {department.fullName || department.name}
              </p>
            )}
            <h2 className='text-sm text-muted-foreground tracking-tight'>
              Divisions
            </h2>
            {needsDepartment && (
              <p className='text-2xl text-muted-foreground'>
                No departments yet
              </p>
            )}
          </div>
          {needsDepartment && (
            <Button
              variant='outline'
              onClick={() => setShowCreateDepartment(true)}
            >
              <Plus className='h-4 w-4' />
              Create Department
            </Button>
          )}
          {canCreateDivision && (
            <Button
              variant='outline'
              onClick={() => setShowCreateDivision(true)}
            >
              <Plus className='h-4 w-4' />
              Create Division
            </Button>
          )}
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {needsDepartment && (
            <Card
              className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
              onClick={() => setShowCreateDepartment(true)}
            >
              <CardContent className='flex flex-col items-center justify-center pt-6'>
                <Plus className='h-10 w-10 text-primary mb-2' />
                <p className='text-sm font-medium'>Create Department</p>
                <p className='text-xs text-muted-foreground text-center px-2'>
                  Add your first department to start adding divisions
                </p>
              </CardContent>
            </Card>
          )}
          {divisions.map(div => (
            <Card
              key={div._id}
              className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
            >
              <Link
                href={`/divisions/${div.slug?.current ?? div._id}`}
                prefetch={false}
              >
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-xs font-medium text-muted-foreground'>
                    Division
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-lg font-bold'>{div.fullName}</div>
                  <p className='text-xs text-muted-foreground'>
                    {div.sectionCount === 1
                      ? '1 section'
                      : `${div.sectionCount ?? 0} sections`}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
          {canCreateDivision && (
            <Card
              className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
              onClick={() => setShowCreateDivision(true)}
            >
              <CardContent className='flex flex-col items-center justify-center pt-6'>
                <Plus className='h-10 w-10 text-primary mb-2' />
                <p className='text-sm font-medium'>Create Division</p>
                <p className='text-xs text-muted-foreground'>
                  Add a division to {departmentName}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {needsDepartment && (
          <CreateDepartmentDialog
            open={showCreateDepartment}
            onOpenChange={setShowCreateDepartment}
            commissioners={commissioners}
          />
        )}
        {canCreateDivision && (
          <CreateDivisionDialog
            open={showCreateDivision}
            onOpenChange={setShowCreateDivision}
            departmentId={department._id}
            departmentName={departmentName}
            assistantCommissioners={assistantCommissioners}
          />
        )}
      </div>
    </div>
  )
}
