import { SignUp } from '@clerk/nextjs'

const POST_SIGN_UP_URL = '/auth/continue'

/** Invite-only sign-up — consumes __clerk_ticket from invitation emails. */
export default function SignUpPage() {
  return (
    <div className='relative flex min-h-svh items-center justify-center bg-muted-foreground/10 p-4'>
      <SignUp
        routing='path'
        path='/sign-up'
        signInUrl='/sign-in'
        forceRedirectUrl={POST_SIGN_UP_URL}
        fallbackRedirectUrl={POST_SIGN_UP_URL}
      />
    </div>
  )
}
