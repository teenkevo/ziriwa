import { AdminNavLink } from '@/components/admin/admin-nav-link'
import { AppTopBar } from '@/components/app-top-bar'

export function AppTopBarShell() {
  return <AppTopBar adminNav={<AdminNavLink />} />
}
