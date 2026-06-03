import { getDepartmentsWithDivisionsForSidebar } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import { AppSidebarNav } from '@/components/app-sidebar-nav'
import type { SidebarSection } from '@/components/app-sidebar-nav'
import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import { getSprintNavCountsForViewer } from '@/lib/sprint-nav-counts.server'

export async function AppSidebarNavWrapper() {
  const role = await getAppRole()
  const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
  const useFallbackExplorer = await isSuperadmin()

  if (useFallbackExplorer) {
    return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
  }

  if (role === 'commissioner') {
    const user = await currentUser()
    const email = (
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      ''
    )
      .trim()
      .toLowerCase()

    const commissionerDepartmentId = email
      ? await client.fetch<string | null>(
          /* groq */ `
            coalesce(
              *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
              *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
              *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
            )
          `,
          { email },
        )
      : null

    const commissionerDivisions = commissionerDepartmentId
      ? departmentsTree.find(dept => dept._id === commissionerDepartmentId)?.divisions ?? []
      : []

    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='commissioner'
        commissionerDivisions={commissionerDivisions}
      />
    )
  }

  if (role === 'manager') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='manager'
        managerSprintsReviewLabel='To Review'
        sprintNavCounts={sprintNavCounts}
      />
    )
  }

  if (role === 'supervisor') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='supervisor'
        managerSprintsReviewLabel='In Review'
        sprintNavCounts={sprintNavCounts}
      />
    )
  }

  if (role === 'officer') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='officer'
        sprintNavCounts={sprintNavCounts}
      />
    )
  }

  if (role === 'assistant_commissioner') {
    const division = await getAssistantCommissionerDivision()
    const assistantCommissionerSections = division?._id
      ? await client.fetch<SidebarSection[]>(
          /* groq */ `
            *[_type == "section" && division._ref == $divisionId] | order(order asc, name asc) {
              _id,
              name,
              slug
            }
          `,
          { divisionId: division._id },
        )
      : []

    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='assistant-commissioner'
        assistantCommissionerSections={assistantCommissionerSections ?? []}
      />
    )
  }

  return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
}
