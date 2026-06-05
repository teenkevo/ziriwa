'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PROJECT_ROLE_LABELS,
  projectRoleRequiresWorkstream,
  type ProjectRole,
} from '@/lib/project-role'

interface ProjectRow {
  _id: string
  name: string
  slug?: { current?: string }
}

interface WorkstreamRow {
  _id: string
  name: string
}

export function ProjectsAdminPage({
  initialProjects,
}: {
  initialProjects: ProjectRow[]
}) {
  const router = useRouter()
  const [projects, setProjects] = React.useState(initialProjects)
  const [selectedProjectId, setSelectedProjectId] = React.useState('')
  const [workstreams, setWorkstreams] = React.useState<WorkstreamRow[]>([])

  const [projectName, setProjectName] = React.useState('')
  const [workstreamName, setWorkstreamName] = React.useState('')
  const [memberRole, setMemberRole] =
    React.useState<ProjectRole>('workstream_member')
  const [memberFirstName, setMemberFirstName] = React.useState('')
  const [memberLastName, setMemberLastName] = React.useState('')
  const [memberIdNumber, setMemberIdNumber] = React.useState('')
  const [memberEmail, setMemberEmail] = React.useState('')
  const [memberWorkstreamId, setMemberWorkstreamId] = React.useState('')
  const [isBusy, setIsBusy] = React.useState(false)

  React.useEffect(() => {
    if (!selectedProjectId) {
      setWorkstreams([])
      return
    }
    const ac = new AbortController()
    fetch(`/api/projects/${selectedProjectId}/workstreams`, {
      signal: ac.signal,
    })
      .then(r => (r.ok ? r.json() : { workstreams: [] }))
      .then((data: { workstreams?: WorkstreamRow[] }) => {
        setWorkstreams(data.workstreams ?? [])
      })
      .catch(() => setWorkstreams([]))
    return () => ac.abort()
  }, [selectedProjectId])

  async function refreshProjects() {
    const res = await fetch('/api/projects')
    if (res.ok) {
      const data = (await res.json()) as { projects?: ProjectRow[] }
      setProjects(data.projects ?? [])
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    setIsBusy(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to create project',
        )
      }
      setProjectName('')
      await refreshProjects()
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleCreateWorkstream(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProjectId) return
    setIsBusy(true)
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/workstreams`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: workstreamName }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to create workstream',
        )
      }
      setWorkstreamName('')
      const listRes = await fetch(
        `/api/projects/${selectedProjectId}/workstreams`,
      )
      if (listRes.ok) {
        const data = (await listRes.json()) as { workstreams?: WorkstreamRow[] }
        setWorkstreams(data.workstreams ?? [])
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleOnboardMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProjectId) return
    setIsBusy(true)
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: memberRole,
          workstreamId: projectRoleRequiresWorkstream(memberRole)
            ? memberWorkstreamId
            : undefined,
          firstName: memberFirstName,
          lastName: memberLastName,
          idNumber: memberIdNumber,
          email: memberEmail,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to onboard',
        )
      }
      setMemberFirstName('')
      setMemberLastName('')
      setMemberIdNumber('')
      setMemberEmail('')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className='mx-auto max-w-2xl space-y-8 p-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Projects</h1>
        <p className='text-muted-foreground text-sm'>
          Create projects, workstreams, and onboard project managers, workstream
          leads, and members.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>
            Bootstrap admin only. Assign the project manager after creation via
            onboarding below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='flex gap-2' onSubmit={e => void handleCreateProject(e)}>
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder='Project name'
              required
            />
            <Button type='submit' disabled={isBusy}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage project</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Active project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select project…' />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectId ? (
            <>
              <form
                className='flex gap-2'
                onSubmit={e => void handleCreateWorkstream(e)}
              >
                <Input
                  value={workstreamName}
                  onChange={e => setWorkstreamName(e.target.value)}
                  placeholder='New workstream name'
                  required
                />
                <Button type='submit' variant='secondary' disabled={isBusy}>
                  Add workstream
                </Button>
              </form>

              <form
                className='space-y-3 border-t pt-4'
                onSubmit={e => void handleOnboardMember(e)}
              >
                <p className='text-sm font-medium'>Onboard team member</p>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='space-y-1'>
                    <Label>Role</Label>
                    <Select
                      value={memberRole}
                      onValueChange={v =>
                        setMemberRole(v as ProjectRole)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]).map(
                          r => (
                            <SelectItem key={r} value={r}>
                              {PROJECT_ROLE_LABELS[r]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {projectRoleRequiresWorkstream(memberRole) ? (
                    <div className='space-y-1'>
                      <Label>Workstream</Label>
                      <Select
                        value={memberWorkstreamId}
                        onValueChange={setMemberWorkstreamId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select workstream…' />
                        </SelectTrigger>
                        <SelectContent>
                          {workstreams.map(w => (
                            <SelectItem key={w._id} value={w._id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className='space-y-1'>
                    <Label>First name</Label>
                    <Input
                      value={memberFirstName}
                      onChange={e => setMemberFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label>Last name</Label>
                    <Input
                      value={memberLastName}
                      onChange={e => setMemberLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label>ID number</Label>
                    <Input
                      value={memberIdNumber}
                      onChange={e => setMemberIdNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-1 sm:col-span-2'>
                    <Label>Email</Label>
                    <Input
                      type='email'
                      value={memberEmail}
                      onChange={e => setMemberEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type='submit' disabled={isBusy}>
                  Onboard & invite
                </Button>
              </form>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
