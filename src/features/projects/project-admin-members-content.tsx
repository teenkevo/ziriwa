'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { CreateProjectMemberDialog } from '@/features/projects/components/create-project-member-dialog'
import { EditProjectMemberDialog } from '@/features/projects/components/edit-project-member-dialog'
import { ProjectMembersTable } from '@/features/projects/components/project-members-table'
import type { ProjectMemberRosterRow } from '@/sanity/lib/projects/get-project-members-roster'
import { getOccupiedWorkstreamLeadIds } from '@/lib/project-workstream-assignment'

interface WorkstreamOption {
  _id: string
  name: string
}

interface ProjectAdminMembersContentProps {
  projectId: string
  initialRoster: ProjectMemberRosterRow[]
  workstreams: WorkstreamOption[]
}

export function ProjectAdminMembersContent({
  projectId,
  initialRoster,
  workstreams,
}: ProjectAdminMembersContentProps) {
  const router = useRouter()
  const [roster, setRoster] = React.useState(initialRoster)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingMember, setEditingMember] =
    React.useState<ProjectMemberRosterRow | null>(null)

  React.useEffect(() => {
    setRoster(initialRoster)
  }, [initialRoster])

  const hasProjectManager = roster.some(
    r =>
      r.status === 'active' &&
      r.projectRole === 'project_manager' &&
      r.memberId !== editingMember?.memberId,
  )
  const hasDeputyProjectManager = roster.some(
    r =>
      r.status === 'active' &&
      r.projectRole === 'deputy_project_manager' &&
      r.memberId !== editingMember?.memberId,
  )

  const occupiedWorkstreamLeadIds = React.useMemo(
    () => getOccupiedWorkstreamLeadIds(roster),
    [roster],
  )
  const editOccupiedWorkstreamLeadIds = React.useMemo(
    () => getOccupiedWorkstreamLeadIds(roster, editingMember?.memberId),
    [roster, editingMember?.memberId],
  )

  const refresh = () => {
    fetch(`/api/projects/${projectId}/members-roster`)
      .then(r => (r.ok ? r.json() : { roster: [] }))
      .then((data: { roster?: ProjectMemberRosterRow[] }) => {
        setRoster(data.roster ?? [])
      })
      .catch(() => {})
    router.refresh()
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Users className='h-5 w-5' />
              Project Members
            </CardTitle>
          </div>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus className='mr-1 h-4 w-4' />
            Add member
          </Button>
        </CardHeader>
        <CardContent>
          <ProjectMembersTable
            projectId={projectId}
            rows={roster}
            onEdit={setEditingMember}
            onRefresh={refresh}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!editingMember}
        onOpenChange={open => !open && setEditingMember(null)}
      >
        <EditProjectMemberDialog
          open={!!editingMember}
          onOpenChange={open => !open && setEditingMember(null)}
          projectId={projectId}
          member={editingMember}
          workstreams={workstreams}
          hasProjectManager={hasProjectManager}
          hasDeputyProjectManager={hasDeputyProjectManager}
          occupiedWorkstreamLeadIds={editOccupiedWorkstreamLeadIds}
          onSuccess={() => {
            setEditingMember(null)
            refresh()
          }}
        />
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <CreateProjectMemberDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          workstreams={workstreams}
          memberRoster={roster}
          hasProjectManager={hasProjectManager}
          hasDeputyProjectManager={hasDeputyProjectManager}
          occupiedWorkstreamLeadIds={occupiedWorkstreamLeadIds}
          onSuccess={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      </Dialog>
    </div>
  )
}
