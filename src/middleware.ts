import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { parseAppRole } from '@/lib/app-role'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { checkStaffEmail } from '@/sanity/lib/staff/check-staff-email'
import { client } from '@/sanity/lib/client'

// Set to 'true' to require auth + staff email in Sanity. 'false' = open access (dev).
const AUTH_GATED = process.env.AUTH_GATED === 'true'

async function getStaffRoleByEmail(email: string) {
  if (!email) return null

  const staff = await client.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{ role }`,
    { email: email.toLowerCase() },
  )

  return parseAppRole(staff?.role)
}

async function getStaffSectionPathByEmail(email: string) {
  if (!email) return null

  const section = await client.fetch<{
    _id: string
    slug?: { current?: string }
  } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active" && defined(section._ref)][0].section->{
      _id,
      slug
    }`,
    { email: email.toLowerCase() },
  )

  const sectionKey = section?.slug?.current ?? section?._id
  return sectionKey ? `/sections/${sectionKey}` : null
}

async function getWorkspaceDestination(userId: string, requestUrl: string) {
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const roleFromMetadata = parseAppRole(
    (user.publicMetadata as Record<string, unknown> | undefined)?.appRole,
  )

  const primaryEmail = user.emailAddresses?.find(
    (email: any) => email.id === user.primaryEmailAddressId,
  )?.emailAddress
  const normalizedEmail = primaryEmail?.toLowerCase() ?? ''
  const isFallbackExplorer = getSuperadminEmailWhitelist().includes(
    normalizedEmail,
  )
  if (isFallbackExplorer) {
    return new URL('/departments', requestUrl)
  }
  const role = roleFromMetadata ?? (await getStaffRoleByEmail(primaryEmail ?? ''))

  if (role === 'assistant_commissioner') {
    return new URL('/assistant-commissioner/dashboard', requestUrl)
  }

  if (role === 'commissioner') {
    return new URL('/commissioner/dashboard', requestUrl)
  }

  if (role === 'manager' || role === 'supervisor') {
    return new URL('/manager/dashboard', requestUrl)
  }

  if (role === 'officer') {
    return new URL('/officer/dashboard', requestUrl)
  }

  return new URL('/departments', requestUrl)
}

// Define public routes - homepage and Clerk auth routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  '/unauthorized',
  '/studio(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/sign-up')) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (userId && pathname === '/workspace') {
    return NextResponse.redirect(
      await getWorkspaceDestination(userId, request.url),
    )
  }

  // Redirect authenticated users through workspace so role-specific routing
  // stays centralized.
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/workspace', request.url))
  }

  // Skip auth gating when AUTH_GATED is not 'true'
  if (!AUTH_GATED) {
    return NextResponse.next()
  }

  // Protect all routes except public routes
  if (!isPublicRoute(request)) {
    // If user is authenticated, verify their email exists on a staff record in Sanity
    if (userId) {
      try {
        const clerk = await clerkClient()
        const user = await clerk.users.getUser(userId)

        // Get the primary email address
        const primaryEmail = user.emailAddresses?.find(
          (email: any) => email.id === user.primaryEmailAddressId,
        )?.emailAddress

        if (primaryEmail) {
          const emailExists = await checkStaffEmail(primaryEmail)

          if (!emailExists) {
            // User's email is not in Sanity, redirect to unauthorized
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
        } else {
          // No email found, redirect to unauthorized
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      } catch (error) {
        // If there's an error getting the user (e.g., user was deleted),
        // redirect to unauthorized page
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // Protect the route (will redirect to sign-in if not authenticated)
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
