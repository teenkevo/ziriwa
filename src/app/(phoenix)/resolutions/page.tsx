import ResolutionsPage from '@/features/resolutions/resolutions'
import { getAllResolutions } from '@/sanity/lib/resolutions/get-all-resolutions'
import { getAllPositions } from '@/sanity/lib/resolutions/get-all-positions'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'
import { Suspense } from 'react'
import Loading from '../loading'

export default async function Resolutions() {
  const [resolutions, positions, members] = await Promise.all([
    getAllResolutions(),
    getAllPositions(),
    getAllMembers(),
  ])

  return (
    <Suspense fallback={<Loading />}>
      <ResolutionsPage
        resolutions={resolutions}
        positions={positions}
        members={members}
      />
    </Suspense>
  )
}

