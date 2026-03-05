import DashboardPage from '@/features/dashboard/dashboard'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'
import { getAllPositions } from '@/sanity/lib/resolutions/get-all-positions'
import { getDivisionBySlug } from '@/sanity/lib/divisions/get-division-by-slug'
import { getSectionsByDivision } from '@/sanity/lib/sections/get-sections-by-division'
import { getManagers } from '@/sanity/lib/staff/get-managers'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import Loading from '../loading'
import { DIVISION_COOKIE_NAME, getDefaultDivisionSlug } from '@/lib/division'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const divisionSlug =
    cookieStore.get(DIVISION_COOKIE_NAME)?.value || getDefaultDivisionSlug()

  const [members, positions, division, managers] = await Promise.all([
    getAllMembers(),
    getAllPositions(),
    getDivisionBySlug(divisionSlug),
    getManagers(),
  ])

  const sections = division
    ? await getSectionsByDivision(division._id)
    : []

  return (
    <Suspense fallback={<Loading />}>
      <DashboardPage
        members={members}
        positions={positions}
        sections={sections}
        division={division}
        managers={managers}
      />
    </Suspense>
  )
}
