import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { checkStaffEmail } from '@/sanity/lib/staff/check-staff-email'
import { isMaintenanceModeEnabled } from '@/lib/maintenance-mode'

const isMaintenanceBypassRoute = createRouteMatcher([
  '/maintenance',
  '/api/webhooks/clerk(.*)',
  '/api/cron(.*)',
])

// Set to 'true' to require auth + staff email in Sanity. 'false' = open access (dev).
const AUTH_GATED = process.env.AUTH_GATED === 'true'

// Define public routes - homepage, Clerk auth, and Clerk frontend API (handshake)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/auth/continue(.*)',
  '/__clerk(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/cron(.*)',
  '/unauthorized',
  '/maintenance',
  '/studio(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const { pathname } = request.nextUrl

  if (isMaintenanceModeEnabled() && !isMaintenanceBypassRoute(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable', maintenance: true },
        { status: 503 },
      )
    }

    if (pathname !== '/maintenance') {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  // Post-sign-in boot (loader + workspace routing).
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/auth/continue', request.url))
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

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk frontend API (session handshake); required for sign-in UI in production
    '/__clerk/(.*)',
  ],
}
