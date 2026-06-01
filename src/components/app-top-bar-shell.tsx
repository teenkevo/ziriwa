import { AppTopBar } from '@/components/app-top-bar'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getRoleNavbarIdentity } from '@/lib/role-navbar-identity.server'

export async function AppTopBarShell() {
  const useFallbackExplorer = await isSuperadmin()
  const roleIdentity = useFallbackExplorer ? null : await getRoleNavbarIdentity()

  return <AppTopBar roleIdentity={roleIdentity} />
}
