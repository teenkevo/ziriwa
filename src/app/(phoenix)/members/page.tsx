import MembersPage from '@/features/members/members'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'
import { Suspense } from 'react'
import Loading from '../loading'

export default async function Members() {
  const [members] = await Promise.all([getAllMembers()])

  return (
    <Suspense fallback={<Loading />}>
      <MembersPage members={members} />
    </Suspense>
  )
}
