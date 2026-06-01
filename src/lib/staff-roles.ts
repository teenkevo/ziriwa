export const STAFF_ROLE_OPTIONS = [
  { title: 'Commissioner General', value: 'commissioner_general' },
  { title: 'Commissioner', value: 'commissioner' },
  { title: 'Assistant Commissioner', value: 'assistant_commissioner' },
  { title: 'Manager', value: 'manager' },
  { title: 'Supervisor', value: 'supervisor' },
  { title: 'Officer', value: 'officer' },
] as const

export type StaffRoleValue = (typeof STAFF_ROLE_OPTIONS)[number]['value']

/** @deprecated Import from `@/lib/staff-email-policy` */
export { URA_EMAIL_SUFFIX } from '@/lib/staff-email-policy'
