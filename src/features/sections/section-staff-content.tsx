'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'
import type { SectionAccess } from '@/lib/section-access'
import { Button } from '@/components/ui/button'
import {
  SectionStaffTable,
  type SectionStaffTableRow,
} from '@/features/sections/components/section-staff-table'
import { EditSectionStaffDialog } from '@/features/sections/components/edit-section-staff-dialog'
import { CreateStaffDialog } from '@/features/dashboard/components/create-staff-dialog'
import { CreateProjectMemberDialog } from '@/features/projects/components/create-project-member-dialog'
import { Dialog } from '@/components/ui/dialog'

interface ProjectMemberEmailRow {
  email?: string | null
  status: string
  workstreamId?: string | null
}

interface ProjectWorkstreamMemberAddConfig {
  projectId: string
  workstreamId: string
  workstreamName: string
  memberRoster: ProjectMemberEmailRow[]
}

interface SectionStaffContentProps {
  sectionId: string
  roster: SectionStaffRoster
  sectionAccess: SectionAccess
  /** Overrides default "Add staff" button label. */
  addStaffLabel?: string
  /** When set, "Add staff" creates a workstream member via the project members API. */
  projectWorkstreamMemberAdd?: ProjectWorkstreamMemberAddConfig
}

function isLeaveDelegation(purpose?: string) {
  return purpose !== 'contract_support'
}

function buildTableRows(roster: SectionStaffRoster): SectionStaffTableRow[] {
  const actingByStaff = new Map<string, string>()
  for (const d of roster.activeDelegations) {
    if (!isLeaveDelegation(d.purpose)) continue
    actingByStaff.set(
      d.toStaff._id,
      `Acting ${d.actingRole} for ${d.fromStaff.fullName}`,
    )
  }

  const rows: SectionStaffTableRow[] = []

  if (roster.manager) {
    rows.push({
      ...roster.manager,
      actingLabel: actingByStaff.get(roster.manager._id) ?? null,
    })
  }

  for (const s of roster.supervisors) {
    rows.push({
      ...s,
      actingLabel: actingByStaff.get(s._id) ?? null,
    })
  }
  for (const o of roster.officers) {
    rows.push({
      ...o,
      actingLabel: actingByStaff.get(o._id) ?? null,
    })
  }

  return rows
}

export function SectionStaffContent({
  sectionId,
  roster,
  sectionAccess,
  addStaffLabel = 'Add staff',
  projectWorkstreamMemberAdd,
}: SectionStaffContentProps) {
  const router = useRouter()
  const canManageMainstreamStaff = sectionAccess.canManageSectionStaff
  const canAddWorkstreamMembers = Boolean(
    projectWorkstreamMemberAdd && sectionAccess.canManageWorkstreamStaff,
  )
  const canAddStaff = canManageMainstreamStaff || canAddWorkstreamMembers
  const canManageTableActions = canManageMainstreamStaff
  const canManageSupervisors =
    sectionAccess.isGlobalAdmin || sectionAccess.isSectionManager
  const hasPlanningSupervisor =
    sectionAccess.isPlanningSection && roster.supervisors.length >= 1
  const allowedCreateRoles = canManageSupervisors
    ? hasPlanningSupervisor
      ? (['officer'] as const)
      : (['supervisor', 'officer'] as const)
    : (['officer'] as const)

  const leaveDelegations = roster.activeDelegations.filter(d =>
    isLeaveDelegation(d.purpose),
  )

  const [rows, setRows] = React.useState(() => buildTableRows(roster))
  const [addStaffOpen, setAddStaffOpen] = React.useState(false)
  const [editStaff, setEditStaff] = React.useState<SectionStaffTableRow | null>(
    null,
  )

  React.useEffect(() => {
    setRows(buildTableRows(roster))
  }, [roster])

  const refresh = () => router.refresh()

  function canManageRow(row: SectionStaffTableRow) {
    if (!canManageTableActions) return false
    if (canManageSupervisors) return row.role === 'supervisor' || row.role === 'officer'
    return row.role === 'officer'
  }

  return (
    <div className='space-y-6'>
      {leaveDelegations.length > 0 && (
        <div className='rounded-md border bg-muted/30 p-4 text-sm space-y-2'>
          <p className='font-medium'>Active & scheduled delegations</p>
          <ul className='list-disc pl-5 text-muted-foreground space-y-1'>
            {leaveDelegations.map(d => (
              <li key={d._id}>
                {d.toStaff.fullName} acting as {d.actingRole} for{' '}
                {d.fromStaff.fullName} ({d.startDate} – {d.endDate})
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionStaffTable
        rows={rows}
        canManage={canManageTableActions}
        canManageRow={canManageRow}
        onEdit={setEditStaff}
        onRefresh={refresh}
        toolbarAction={
          canAddStaff ? (
            <Button size='sm' onClick={() => setAddStaffOpen(true)}>
              <Plus className='h-4 w-4 mr-1' />
              {addStaffLabel}
            </Button>
          ) : null
        }
      />

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        {canAddWorkstreamMembers && projectWorkstreamMemberAdd ? (
          <CreateProjectMemberDialog
            open={addStaffOpen}
            onOpenChange={setAddStaffOpen}
            projectId={projectWorkstreamMemberAdd.projectId}
            workstreams={[
              {
                _id: projectWorkstreamMemberAdd.workstreamId,
                name: projectWorkstreamMemberAdd.workstreamName,
              },
            ]}
            memberRoster={projectWorkstreamMemberAdd.memberRoster}
            lockedRole='workstream_member'
            fixedWorkstreamId={projectWorkstreamMemberAdd.workstreamId}
            fixedWorkstreamName={projectWorkstreamMemberAdd.workstreamName}
            onSuccess={() => {
              setAddStaffOpen(false)
              refresh()
            }}
          />
        ) : (
          <CreateStaffDialog
            open={addStaffOpen}
            onOpenChange={setAddStaffOpen}
            allowedRoles={allowedCreateRoles}
            fixedSectionId={sectionId}
            createApiUrl={`/api/sections/${sectionId}/staff`}
            onSuccess={() => {
              setAddStaffOpen(false)
              refresh()
            }}
          />
        )}
      </Dialog>

      <EditSectionStaffDialog
        open={editStaff !== null}
        onOpenChange={o => !o && setEditStaff(null)}
        staff={editStaff}
        onSuccess={refresh}
      />
    </div>
  )
}
