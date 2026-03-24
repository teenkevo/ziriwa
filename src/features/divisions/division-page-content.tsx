'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { CreateSectionDialog } from '@/features/dashboard/components/create-section-dialog'

type Division = {
  _id: string
  name: string
  fullName?: string
  department?: { _id: string; fullName?: string; acronym?: string }
}

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  manager?: { _id: string; fullName: string }
}

type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export function DivisionPageContent({
  division,
  sections,
  managers,
}: {
  division: Division
  sections: Section[]
  managers: StaffMember[]
}) {
  const [showCreateSection, setShowCreateSection] = useState(false)

  const divisionLabel = division.fullName || division.name
  const departmentLabel =
    division.department?.acronym || division.department?.fullName || null

  return (
    <div className='flex-col md:flex'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <Breadcrumb className='text-muted-foreground'>
          <BreadcrumbList>
            {departmentLabel && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href='/dashboard'>{departmentLabel}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/dashboard'>Divisions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{divisionLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className='flex items-center justify-between'>
          <div>
            <h2 className='font-bold tracking-tight'>{divisionLabel}</h2>
            <p className='text-sm text-muted-foreground'>Sections</p>
          </div>
          <Button variant='outline' onClick={() => setShowCreateSection(true)}>
            <Plus className='h-4 w-4' />
            Create Section
          </Button>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {sections.map(section => (
            <Card
              key={section._id}
              className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
            >
              <Link
                href={`/sections/${section.slug?.current ?? section._id}`}
                prefetch={false}
              >
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-xs font-medium text-muted-foreground'>
                    Section
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-lg'>{section.name}</div>
                  {section.manager && (
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Managed by {section.manager.fullName}
                    </p>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
          <Card
            className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
            onClick={() => setShowCreateSection(true)}
          >
            <CardContent className='flex flex-col items-center justify-center pt-6'>
              <Plus className='h-10 w-10 text-primary mb-2' />
              <p className='text-sm font-medium'>Create Section</p>
              <p className='text-xs text-muted-foreground'>
                Add a section to {division.name}
              </p>
            </CardContent>
          </Card>
        </div>

        <CreateSectionDialog
          open={showCreateSection}
          onOpenChange={setShowCreateSection}
          divisionId={division._id}
          departmentId={division.department?._id ?? ''}
          divisionName={division.name}
          managers={managers}
        />
      </div>
    </div>
  )
}
