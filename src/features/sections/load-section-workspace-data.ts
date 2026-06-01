import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getStakeholderEngagementBySection } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-section'
import {
  getSupervisorsBySection,
  getOfficersBySection,
} from '@/sanity/lib/staff/get-staff-by-section'
import { getManagersForPicker } from '@/sanity/lib/staff/get-staff-for-picker'
import { getDueItemsFromContract } from '@/sanity/lib/contract-items/get-due-items'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { WorkContextMode } from '@/lib/section-access'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import {
  shouldScopeSprintsToOfficer,
  shouldScopeSprintsToSupervisor,
  shouldUseOfficerContract,
} from '@/lib/sprint-workspace-scope'
import { canCreateSelfServiceDelegation } from '@/lib/role-delegation'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import { getDelegationCandidatesForStaff } from '@/lib/section-delegation-candidates.server'
import { getSectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'
import { getSupervisorContractForViewer } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract-for-viewer'
import type { SupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { getOfficerContractForViewer } from '@/sanity/lib/officer-contracts/get-officer-contract-for-viewer'
import type { OfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'

export type WorkspaceSection = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
  manager?: { _id: string; fullName?: string }
}

type SectionLookup = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
  manager?: { _id: string; fullName?: string }
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

export async function getManagedSectionsForViewer(): Promise<SectionLookup[]> {
  const email = await getViewerEmail()
  if (!email) return []

  return client.fetch<SectionLookup[]>(
    /* groq */ `
      *[_type == "section" && (
        lower(manager->email) == $email ||
        lower(division->assistantCommissioner->email) == $email ||
        division._ref in *[_type == "staff" && lower(email) == $email && status == "active" && role == "assistant_commissioner" && defined(division._ref)].division._ref ||
        _id in *[_type == "staff" && lower(email) == $email && defined(section._ref)].section._ref
      )] | order(name asc) {
        _id,
        name,
        slug,
        division->{ _id, name, slug },
        manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
      }
    `,
    { email },
  )
}

export type LoadSectionWorkspaceOptions = {
  workContext?: WorkContextMode
}

function parseWorkContext(value: string | undefined): WorkContextMode {
  return value === 'acting' ? 'acting' : 'own'
}

export async function loadSectionWorkspaceData(
  sectionIdOrSlug: string,
  options?: LoadSectionWorkspaceOptions,
) {
  const workContext = parseWorkContext(options?.workContext)
  const sectionBySlug = await getSectionBySlug(sectionIdOrSlug)
  const section =
    sectionBySlug ??
    (await client.fetch<WorkspaceSection | null>(
      /* groq */ `
        *[_type == "section" && _id == $sectionId][0] {
          _id,
          name,
          slug,
          division->{ _id, name, slug },
          manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
        }
      `,
      { sectionId: sectionIdOrSlug },
    ))

  if (!section) return null

  const [
    sectionContract,
    stakeholderEngagement,
    supervisors,
    officers,
    sprints,
    managers,
    staffRoster,
  ] = await Promise.all([
    getSectionContractBySection(section._id),
    getStakeholderEngagementBySection(section._id),
    getSupervisorsBySection(section._id),
    getOfficersBySection(section._id),
    getSprintsBySection(section._id),
    getManagersForPicker(),
    getSectionStaffRoster(section._id),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diffToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 4)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const quarter = Math.floor(now.getMonth() / 3) + 1
  const startOfQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
  const endOfQuarter = new Date(now.getFullYear(), quarter * 3, 0)

  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const weekEnd = endOfWeek.toISOString().slice(0, 10)
  const monthStart = startOfMonth.toISOString().slice(0, 10)
  const monthEnd = endOfMonth.toISOString().slice(0, 10)
  const quarterStart = startOfQuarter.toISOString().slice(0, 10)
  const quarterEnd = endOfQuarter.toISOString().slice(0, 10)

  const dueToday = sectionContract
    ? getDueItemsFromContract(sectionContract, d => d === today)
    : []
  const dueThisWeek = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d => d >= weekStart && d <= weekEnd && d !== today,
      )
    : []
  const dueThisMonth = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d =>
          d >= monthStart &&
          d <= monthEnd &&
          d !== today &&
          !(d >= weekStart && d <= weekEnd),
      )
    : []
  const dueThisQuarter = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d =>
          d >= quarterStart &&
          d <= quarterEnd &&
          d !== today &&
          !(d >= monthStart && d <= monthEnd),
      )
    : []

  const staffOptions: { _id: string; fullName?: string; staffId?: string }[] = [
    ...(section.manager ? [section.manager] : []),
    ...supervisors,
    ...officers,
  ].map(s => {
    const staffId =
      'staffId' in s && typeof s.staffId === 'string' ? s.staffId : undefined
    return { _id: s._id, fullName: s.fullName, staffId }
  })

  const sectionAccess = await getSectionAccessForViewer(section._id, workContext)

  const orgActingAsDelegatee = sectionAccess.viewerStaffId
    ? await getActiveOrgDelegationAsDelegatee(sectionAccess.viewerStaffId)
    : null

  const mayCreateDelegation = canCreateSelfServiceDelegation({
    roleAllowsDelegation: sectionAccess.canSelfServiceDelegate,
    workContext,
    assignmentAsDelegatee: sectionAccess.delegation.assignmentAsDelegatee,
    assignmentAsAbsent: sectionAccess.delegation.assignmentAsAbsent,
    hasOtherScopeActingAssignment: Boolean(orgActingAsDelegatee),
  })

  const delegationCandidates =
    mayCreateDelegation && sectionAccess.viewerStaffId
      ? await getDelegationCandidatesForStaff(
          section._id,
          sectionAccess.viewerStaffId,
        )
      : []

  const usesSupervisorContract = shouldScopeSprintsToSupervisor(sectionAccess)
  const usesOfficerContract = shouldUseOfficerContract(sectionAccess)
  const supervisorStaffId =
    sectionAccess.supervisorContextStaffId ?? sectionAccess.viewerStaffId
  const officerStaffId =
    sectionAccess.officerContextStaffId ?? sectionAccess.viewerStaffId

  let supervisorContract: SupervisorContract | null = null
  let officerContract: OfficerContract | null = null
  if (usesSupervisorContract && supervisorStaffId) {
    supervisorContract = await getSupervisorContractForViewer(
      section._id,
      supervisorStaffId,
    )
  }
  if (usesOfficerContract && officerStaffId) {
    officerContract = await getOfficerContractForViewer(
      section._id,
      officerStaffId,
    )
  }

  const usesPersonalContract = usesSupervisorContract || usesOfficerContract
  const contractForDue = (usesOfficerContract
    ? officerContract
    : usesSupervisorContract
      ? supervisorContract
      : sectionContract) as SectionContract | null

  const dueTodaySupervisor = contractForDue
    ? getDueItemsFromContract(contractForDue, d => d === today)
    : []
  const dueThisWeekSupervisor = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d => d >= weekStart && d <= weekEnd && d !== today,
      )
    : []
  const dueThisMonthSupervisor = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= monthStart &&
          d <= monthEnd &&
          d !== today &&
          !(d >= weekStart && d <= weekEnd),
      )
    : []
  const dueThisQuarterSupervisor = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= quarterStart &&
          d <= quarterEnd &&
          d !== today &&
          !(d >= monthStart && d <= monthEnd),
      )
    : []

  return {
    section,
    sectionContract,
    supervisorContract,
    officerContract,
    stakeholderEngagement,
    staffOptions,
    supervisors,
    officers,
    dueToday: usesPersonalContract ? dueTodaySupervisor : dueToday,
    dueThisWeek: usesPersonalContract ? dueThisWeekSupervisor : dueThisWeek,
    dueThisMonth: usesPersonalContract ? dueThisMonthSupervisor : dueThisMonth,
    dueThisQuarter: usesPersonalContract
      ? dueThisQuarterSupervisor
      : dueThisQuarter,
    today,
    sprints,
    viewerStaffId: sectionAccess.viewerStaffId ?? undefined,
    sectionAccess,
    staffRoster,
    managers,
    workContext,
    delegationCandidates,
  }
}
