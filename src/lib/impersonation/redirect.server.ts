import 'server-only'

import type { AppRole } from '@/lib/app-role'

export function mainstreamDashboardPathForRole(role: AppRole | null): string {
  switch (role) {
    case 'assistant_commissioner':
      return '/assistant-commissioner/dashboard'
    case 'commissioner':
    case 'commissioner_general':
      return '/commissioner/dashboard'
    case 'manager':
      return '/manager/dashboard'
    case 'supervisor':
      return '/supervisor/dashboard'
    case 'officer':
      return '/officer/dashboard'
    default:
      return '/departments'
  }
}
