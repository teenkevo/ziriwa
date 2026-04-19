import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

// Set to 'true' to require auth + staff email in Sanity. 'false' = open access (dev).
const AUTH_GATED = process.env.AUTH_GATED === 'true'

// Define public routes - homepage and Clerk auth routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/auth/check-staff-email',
  '/unauthorized',
  '/studio(.*)',
])

// When auth-gating is disabled, avoid running Clerk middleware entirely.
// This prevents Clerk dev-browser checks from blocking local curl/tests.
const middleware = AUTH_GATED
  ? clerkMiddleware(async (auth, request) => {
      const { userId } = await auth()
      const { pathname } = request.nextUrl

      // Redirect authenticated users away from homepage to departments
      if (userId && pathname === '/') {
        return NextResponse.redirect(new URL('/departments', request.url))
      }

      // Protect all routes except public routes
      if (!isPublicRoute(request)) {
        // If user is authenticated, verify their email exists on a staff record
        // by calling a Node runtime API (middleware is Edge runtime).
        if (userId) {
          try {
            const clerk = await clerkClient()
            const user = await clerk.users.getUser(userId)

            // Get the primary email address
            const primaryEmail = user.emailAddresses?.find(
              (email: any) => email.id === user.primaryEmailAddressId,
            )?.emailAddress

            if (primaryEmail) {
              const url = new URL('/api/auth/check-staff-email', request.url)
              url.searchParams.set('email', primaryEmail)
              const resp = await fetch(url, { method: 'GET' })
              const data = (await resp.json()) as { exists?: boolean }
              const emailExists = resp.ok && data.exists === true

              if (!emailExists) {
                // User's email is not in Sanity, redirect to unauthorized
                return NextResponse.redirect(
                  new URL('/unauthorized', request.url),
                )
              }
            } else {
              // No email found, redirect to unauthorized
              return NextResponse.redirect(
                new URL('/unauthorized', request.url),
              )
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
  : (_req: Request) => NextResponse.next()

export default middleware

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
