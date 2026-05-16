import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { syncClerkAppRoleFromStaffEmail } from '@/lib/admin/onboard-staff-clerk'
import { checkStaffEmail } from '@/sanity/lib/staff/check-staff-email'

export async function POST(req: NextRequest) {
  const evt = await verifyWebhook(req)

  if (evt.type === 'user.created') {
    const { email_addresses, id } = evt.data

    const primaryEmail = email_addresses?.find(
      (email: { id: string }) => email.id === evt.data.primary_email_address_id,
    )?.email_address

    if (!primaryEmail) {
      return NextResponse.json({ status: 'no_email' })
    }

    const emailExists = await checkStaffEmail(primaryEmail)

    if (!emailExists) {
      try {
        const clerk = await clerkClient()
        await clerk.users.deleteUser(id)
        return NextResponse.json({ status: 'deleted' }, { status: 404 })
      } catch {
        return NextResponse.json({ status: 'error' }, { status: 500 })
      }
    }

    try {
      await syncClerkAppRoleFromStaffEmail(id, primaryEmail)
    } catch (error) {
      console.error('Failed to sync app role on user.created', error)
    }

    return NextResponse.json({ status: 'approved' }, { status: 200 })
  }

  return NextResponse.json({ status: 'unknown' }, { status: 200 })
}
