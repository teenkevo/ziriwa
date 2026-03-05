import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { checkMemberEmail } from '@/sanity/lib/members/check-member-email'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const evt = await verifyWebhook(req)

  // Handle session creation - smart sync on login
  if (evt.type === 'user.created') {
    const { email_addresses, id } = evt.data

    // Get the primary email address
    const primaryEmail = email_addresses?.find(
      (email: any) => email.id === evt.data.primary_email_address_id,
    )?.email_address

    if (!primaryEmail) {
      return NextResponse.json({ status: 'no_email' })
    }

    // Check if email exists in Sanity members
    const emailExists = await checkMemberEmail(primaryEmail)

    if (!emailExists) {
      try {
        const clerk = await clerkClient()
        await clerk.users.deleteUser(id)
        return NextResponse.json({ status: 'deleted' }, { status: 404 })
      } catch (error) {
        return NextResponse.json({ status: 'error' }, { status: 500 })
      }
    }
    return NextResponse.json(
      {
        status: 'approved',
      },
      { status: 200 },
    )
  }
  return NextResponse.json({ status: 'unknown' }, { status: 200 })
}
