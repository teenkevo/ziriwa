import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { APP_ROLE_LABELS } from '@/lib/authz/types'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import {
  getProjectByIdForViewer,
  getProjectMembershipForViewer,
} from '@/lib/project-access.server'
import { formatProjectNavbarRoleLabel } from '@/lib/project-role'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { client } from '@/sanity/lib/client'

export type RoleNavbarIdentity = {
  roleLabel: string
  contextLabel?: string
  separator: '|' | '-'
}

async function getViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

async function getStaffSectionName(email: string) {
  if (!email) return null

  const row = await client.fetch<{ name?: string } | null>(
    /* groq */ `
      *[_type == "staff" && lower(email) == $email && status == "active" && defined(section._ref)][0].section->{
        name
      }
    `,
    { email },
  )

  return row?.name?.trim() || null
}

/** Display name for the department the viewer leads (commissioner). Mirrors load-commissioner-dashboard. */
async function getLedDepartmentDisplayName(email: string) {
  if (!email) return null

  const row = await client.fetch<{ name?: string } | null>(
    /* groq */ `
      coalesce(
        *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]{
          "name": coalesce(fullName, acronym)
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department->{
          "name": coalesce(fullName, acronym)
        }
      )
    `,
    { email },
  )

  return row?.name?.trim() || null
}

/** Display name for the division the viewer leads (assistant commissioner). Mirrors load-assistant-commissioner-dashboard. */
async function getLedDivisionDisplayName(email: string) {
  if (!email) return null

  const row = await client.fetch<{ name?: string } | null>(
    /* groq */ `
      coalesce(
        *[_type == "division" && assistantCommissioner->status == "active" && lower(assistantCommissioner->email) == $email][0]{
          "name": coalesce(fullName, acronym)
        },
        *[_type == "staff" && lower(email) == $email && status == "active" && role == "assistant_commissioner"][0].division->{
          "name": coalesce(fullName, acronym)
        }
      )
    `,
    { email },
  )

  return row?.name?.trim() || null
}

export async function getRoleNavbarIdentity(): Promise<RoleNavbarIdentity | null> {
  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (isProjects && projectId) {
    if (await isSuperadmin()) {
      const project = await getProjectByIdForViewer(projectId)
      return {
        roleLabel: 'Administrator',
        contextLabel: project?.projectName ?? 'Project',
        separator: '|',
      }
    }

    const membership = await getProjectMembershipForViewer(projectId)
    if (membership) {
      return {
        roleLabel: formatProjectNavbarRoleLabel(
          membership.role,
          membership.workstreamName,
        ),
        contextLabel: membership.projectName,
        separator: '|',
      }
    }
  }

  if (await isSuperadmin()) return null

  const role = await getAppRole()
  if (!role) return null

  const email = await getViewerEmail()

  if (role === 'officer') {
    const sectionName = await getStaffSectionName(email)
    return {
      roleLabel: APP_ROLE_LABELS[role],
      contextLabel: sectionName ?? 'Section',
      separator: '-',
    }
  }

  if (role === 'commissioner') {
    const departmentName = await getLedDepartmentDisplayName(email)
    return {
      roleLabel: APP_ROLE_LABELS[role],
      contextLabel: departmentName ?? 'Department',
      separator: '|',
    }
  }

  if (role === 'assistant_commissioner') {
    const divisionName = await getLedDivisionDisplayName(email)
    return {
      roleLabel: APP_ROLE_LABELS[role],
      contextLabel: divisionName ?? 'Division',
      separator: '|',
    }
  }

  if (role === 'manager' || role === 'supervisor') {
    const sectionName = await getStaffSectionName(email)
    return {
      roleLabel: APP_ROLE_LABELS[role],
      contextLabel: sectionName ?? 'Section',
      separator: '|',
    }
  }

  // Commissioner general has no single led department/division/section in Sanity; show role only.
  if (role === 'commissioner_general') {
    return {
      roleLabel: APP_ROLE_LABELS[role],
      separator: '|',
    }
  }

  return {
    roleLabel: APP_ROLE_LABELS[role],
    separator: '|',
  }
}
