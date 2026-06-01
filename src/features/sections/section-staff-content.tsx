'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'

import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'
import type { SectionAccess } from '@/lib/section-access'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  SectionStaffTable,
  type SectionStaffTableRow,
} from '@/features/sections/components/section-staff-table'
import { EditSectionStaffDialog } from '@/features/sections/components/edit-section-staff-dialog'
import { TransferStaffDialog } from '@/features/sections/components/transfer-staff-dialog'
import { DelegationAuditTable } from '@/features/sections/components/delegation-audit-table'
import { CreateStaffDialog } from '@/features/dashboard/components/create-staff-dialog'
import { Dialog } from '@/components/ui/dialog'

interface SectionStaffContentProps {
  sectionId: string
  sectionName: string
  roster: SectionStaffRoster
  sectionAccess: SectionAccess
}

function buildTableRows(roster: SectionStaffRoster): SectionStaffTableRow[] {
  const actingByStaff = new Map<string, string>()
  for (const d of roster.activeDelegations) {
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
  sectionName,
  roster,
  sectionAccess,
}: SectionStaffContentProps) {
  const router = useRouter()
  const canManage = sectionAccess.canManageSectionStaff

  const [rows, setRows] = React.useState(() => buildTableRows(roster))
  const [addStaffOpen, setAddStaffOpen] = React.useState(false)
  const [editStaff, setEditStaff] = React.useState<SectionStaffTableRow | null>(
    null,
  )
  const [transferStaff, setTransferStaff] =
    React.useState<SectionStaffTableRow | null>(null)

  React.useEffect(() => {
    setRows(buildTableRows(roster))
  }, [roster])

  const refresh = () => router.refresh()

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Users className='h-5 w-5' />
              Section staff
            </CardTitle>
            <CardDescription>Manage {sectionName} staff here.</CardDescription>
          </div>
          {canManage && (
            <Button size='sm' onClick={() => setAddStaffOpen(true)}>
              <Plus className='h-4 w-4 mr-1' />
              Add staff
            </Button>
          )}
        </CardHeader>
        <CardContent className='space-y-6'>
          {roster.activeDelegations.length > 0 && (
            <div className='rounded-md border bg-muted/30 p-4 text-sm space-y-2'>
              <p className='font-medium'>Active & scheduled delegations</p>
              <ul className='list-disc pl-5 text-muted-foreground space-y-1'>
                {roster.activeDelegations.map(d => (
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
            canManage={canManage}
            onEdit={setEditStaff}
            onTransfer={setTransferStaff}
            onRefresh={refresh}
          />

          {/* <div className='space-y-3 pt-2'>
            <div>
              <h3 className='text-sm font-medium'>Delegation audit log</h3>
              <p className='text-xs text-muted-foreground'>
                Full history of acting periods and leave coverage for this
                section.
              </p>
            </div>
            <DelegationAuditTable history={roster.delegationHistory} />
          </div> */}
        </CardContent>
      </Card>

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <CreateStaffDialog
          open={addStaffOpen}
          onOpenChange={setAddStaffOpen}
          allowedRoles={['supervisor', 'officer']}
          fixedSectionId={sectionId}
          createApiUrl={`/api/sections/${sectionId}/staff`}
          onSuccess={() => {
            setAddStaffOpen(false)
            refresh()
          }}
        />
      </Dialog>

      <EditSectionStaffDialog
        open={editStaff !== null}
        onOpenChange={o => !o && setEditStaff(null)}
        staff={editStaff}
        onSuccess={refresh}
      />

      <TransferStaffDialog
        open={transferStaff !== null}
        onOpenChange={o => !o && setTransferStaff(null)}
        sectionId={sectionId}
        staff={transferStaff}
        onSuccess={refresh}
      />
    </div>
  )
}
