import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { parseAppRole } from '@/lib/app-role'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { impersonationCookieClearOptions } from '@/lib/impersonation/cookie-options'
import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/constants'
import { checkStaffEmail } from '@/sanity/lib/staff/check-staff-email'
import { client } from '@/sanity/lib/client'
import { isMaintenanceModeEnabled } from '@/lib/maintenance-mode'

const isMaintenanceBypassRoute = createRouteMatcher([
  '/maintenance',
  '/api/webhooks/clerk(.*)',
  '/api/cron(.*)',
])

function clearImpersonationCookieOnResponse(response: NextResponse) {
  const options = impersonationCookieClearOptions()
  response.cookies.set(options.name, options.value, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  })
  return response
}

function finalizeResponse(
  userId: string | null | undefined,
  request: NextRequest,
  response: NextResponse,
) {
  if (userId) return response
  if (!request.cookies.get(IMPERSONATION_COOKIE_NAME)?.value) return response
  return clearImpersonationCookieOnResponse(response)
}

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

  if (role === 'manager') {
    return new URL('/manager/dashboard', requestUrl)
  }

  if (role === 'supervisor') {
    return new URL('/supervisor/dashboard', requestUrl)
  }

  if (role === 'officer') {
    return new URL('/officer/dashboard', requestUrl)
  }

  return new URL('/departments', requestUrl)
}

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
    return finalizeResponse(
      userId,
      request,
      NextResponse.redirect(new URL('/auth/continue', request.url)),
    )
  }

  // Skip auth gating when AUTH_GATED is not 'true'
  if (!AUTH_GATED) {
    return finalizeResponse(userId, request, NextResponse.next())
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
            return finalizeResponse(
              userId,
              request,
              NextResponse.redirect(new URL('/unauthorized', request.url)),
            )
          }
        } else {
          // No email found, redirect to unauthorized
          return finalizeResponse(
            userId,
            request,
            NextResponse.redirect(new URL('/unauthorized', request.url)),
          )
        }
      } catch (error) {
        // If there's an error getting the user (e.g., user was deleted),
        // redirect to unauthorized page
        return finalizeResponse(
          userId,
          request,
          NextResponse.redirect(new URL('/unauthorized', request.url)),
        )
      }
    }

    // Protect the route (will redirect to sign-in if not authenticated)
    await auth.protect()
  }

  return finalizeResponse(userId, request, NextResponse.next())
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
