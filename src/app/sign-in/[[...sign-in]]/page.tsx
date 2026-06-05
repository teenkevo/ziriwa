import { SignIn } from '@clerk/nextjs'

const POST_SIGN_IN_URL = '/auth/continue'

export default function SignInPage() {
  return (
    <div className='relative flex min-h-svh items-center justify-center bg-muted-foreground/10 p-4'>
      <SignIn
        routing='path'
        path='/sign-in'
        signUpUrl='/sign-up'
        forceRedirectUrl={POST_SIGN_IN_URL}
        fallbackRedirectUrl={POST_SIGN_IN_URL}
      />
    </div>
  )
}
