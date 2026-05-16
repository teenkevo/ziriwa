import { redirect } from 'next/navigation'

/** Public self-service sign-up is disabled; admins onboard via invite. */
export default function SignUpPage() {
  redirect('/sign-in')
}
