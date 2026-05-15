import type { AppRole } from '@/lib/app-role'

export type { AppRole }

export type CrudAction = 'create' | 'read' | 'update' | 'delete'

export type ResourceKey =
  | 'departments'
  | 'divisions'
  | 'sections'
  | 'weeklySprints'
  | 'staff'
  | 'sprintTasks'

export interface CrudPermissions {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface RolePermissions {
  departments: CrudPermissions
  divisions: CrudPermissions
  sections: CrudPermissions
  weeklySprints: CrudPermissions
  staff: CrudPermissions
  sprintTasks: CrudPermissions
}

export type Capabilities = RolePermissions

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  commissioner_general: 'Commissioner General',
  commissioner: 'Commissioner',
  assistant_commissioner: 'Assistant Commissioner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  officer: 'Officer',
}
