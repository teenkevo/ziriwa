export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import Loading from '../../loading'
import Member from '@/features/members/member'
import { getMemberById } from '@/sanity/lib/members/get-member-by-id'
import { getAllPaymentTiers } from '@/sanity/lib/payment-tiers/get-all-payment-tiers'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch data in parallel
  const [memberData, paymentTiers, allMembers] = await Promise.all([
    getMemberById(id),
    getAllPaymentTiers(),
    getAllMembers(),
  ])

  // If project is not found, show 404 placeholder
  if (!memberData || memberData.length === 0) {
    return <div>Member not found</div>
  }

  return (
    <Suspense fallback={<Loading />}>
      <Member
        member={memberData[0]}
        paymentTiers={paymentTiers}
        allMembers={allMembers}
      />
    </Suspense>
  )
}
