export const STAFF_ROLE_OPTIONS = [
  { title: 'Commissioner General', value: 'commissioner_general' },
  { title: 'Commissioner', value: 'commissioner' },
  { title: 'Assistant Commissioner', value: 'assistant_commissioner' },
  { title: 'Manager', value: 'manager' },
  { title: 'Supervisor', value: 'supervisor' },
  { title: 'Officer', value: 'officer' },
] as const

export type StaffRoleValue = (typeof STAFF_ROLE_OPTIONS)[number]['value']

export const URA_EMAIL_SUFFIX = '@ura.go.ug'
