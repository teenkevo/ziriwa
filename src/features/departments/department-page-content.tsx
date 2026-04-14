'use client'

import * as React from 'react'
import { DepartmentDivisionsView } from '@/features/departments/department-divisions-view'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import type { DepartmentDivisionsDivision } from '@/features/departments/department-divisions-view'

type Department = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current: string }
  commissioner?: { _id: string }
}

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

export function DepartmentPageContent({
  department,
  divisions,
  assistantCommissioners,
  assistantCommissionersDepartment,
  commissionersForDepartmentEdit,
}: {
  department: Department
  divisions: DepartmentDivisionsDivision[]
  assistantCommissioners: ACStaffMember[]
  assistantCommissionersDepartment: ACStaffMember[]
  commissionersForDepartmentEdit: CommissionerMember[]
}) {
  const breadcrumbItems = React.useMemo(
    () => [
      { label: 'Departments', href: '/departments' },
      { label: department.fullName || department.name },
    ],
    [department],
  )

  useRegisterPageBreadcrumbs(breadcrumbItems)

  return (
    <DepartmentDivisionsView
      department={department}
      divisions={divisions}
      assistantCommissioners={assistantCommissioners}
      assistantCommissionersDepartment={assistantCommissionersDepartment}
      commissionersForDepartmentEdit={commissionersForDepartmentEdit}
      deleteDepartmentRedirectTo='/departments'
    />
  )
}
