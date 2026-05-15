import type { AppRole } from '@/lib/app-role'
import { APP_ROLE_VALUES } from '@/lib/app-role'
import type { CrudAction, CrudPermissions, ResourceKey, RolePermissions } from '@/lib/authz/types'

function crud(
  create = false,
  read = true,
  update = false,
  canDelete = false,
): CrudPermissions {
  return { create, read, update, delete: canDelete }
}

const readOnly = crud(false, true, false, false)
const manage = crud(true, true, true, false)
const full = crud(true, true, true, true)
const sprintPlan = crud(true, true, true, false)
const sprintView = crud(false, true, false, false)
const officerWork = crud(true, true, true, false)

/**
 * Static RBAC matrix — maps each Clerk `appRole` to CRUD permissions per resource.
 * Adjust here when role capabilities change; UI and API guards read from this table.
 */
export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  commissioner_general: {
    departments: full,
    divisions: full,
    sections: full,
    weeklySprints: sprintPlan,
    staff: full,
    sprintTasks: readOnly,
  },
  commissioner: {
    departments: full,
    divisions: full,
    sections: full,
    weeklySprints: sprintPlan,
    staff: full,
    sprintTasks: readOnly,
  },
  assistant_commissioner: {
    departments: readOnly,
    divisions: readOnly,
    sections: full,
    weeklySprints: sprintPlan,
    staff: readOnly,
    sprintTasks: readOnly,
  },
  manager: {
    departments: readOnly,
    divisions: readOnly,
    sections: readOnly,
    weeklySprints: sprintPlan,
    staff: readOnly,
    sprintTasks: readOnly,
  },
  supervisor: {
    departments: readOnly,
    divisions: readOnly,
    sections: readOnly,
    weeklySprints: sprintPlan,
    staff: readOnly,
    sprintTasks: readOnly,
  },
  officer: {
    departments: readOnly,
    divisions: readOnly,
    sections: readOnly,
    weeklySprints: sprintView,
    staff: readOnly,
    sprintTasks: officerWork,
  },
}

export function getRolePermissions(role: AppRole | null): RolePermissions | null {
  if (!role) return null
  return ROLE_PERMISSIONS[role] ?? null
}

export function hasPermission(
  role: AppRole | null,
  resource: ResourceKey,
  action: CrudAction,
): boolean {
  const perms = getRolePermissions(role)
  if (!perms) return false
  return perms[resource][action]
}

/** @deprecated Prefer `hasPermission(role, 'sections', 'create')`. */
export function canCreateSection(role: AppRole | null): boolean {
  return hasPermission(role, 'sections', 'create')
}

/** @deprecated Prefer `hasPermission(role, 'departments', 'create')`. */
export function canManageDepartments(role: AppRole | null): boolean {
  return hasPermission(role, 'departments', 'create')
}

/** @deprecated Prefer `hasPermission(role, 'divisions', 'create')`. */
export function canManageDivisions(role: AppRole | null): boolean {
  return hasPermission(role, 'divisions', 'create')
}

/** Officers cannot create or edit draft weekly sprint plans. */
export function canManageWeeklySprintDrafts(role: AppRole | null): boolean {
  return hasPermission(role, 'weeklySprints', 'create')
}

export function listRoles(): AppRole[] {
  return [...APP_ROLE_VALUES]
}
