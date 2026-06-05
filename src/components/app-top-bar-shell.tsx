import { AppTopBar } from '@/components/app-top-bar'
import { getRoleNavbarIdentity } from '@/lib/role-navbar-identity.server'

export async function AppTopBarShell() {
  const roleIdentity = await getRoleNavbarIdentity()

  return <AppTopBar roleIdentity={roleIdentity} />
}
