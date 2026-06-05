'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Container } from 'lucide-react'

import { buildWorkspaceEnterHref } from '@/lib/workspace-mode'

import { CreateProjectForm } from '@/features/workspace/create-project-form'
import { WorkspaceEnterLink } from '@/features/workspace/workspace-enter-link'
import { formatProjectMemberCount } from '@/lib/format-project-member-count'
import type { ViewerProjectOption } from '@/sanity/lib/projects/get-projects-for-viewer'

interface ProjectPickerContentProps {
  projects: ViewerProjectOption[]
  canCreateProject?: boolean
  onProjectsChange?: (projects: ViewerProjectOption[]) => void
}

export function ProjectPickerContent({
  projects: initialProjects,
  canCreateProject = false,
  onProjectsChange,
}: ProjectPickerContentProps) {
  const router = useRouter()
  const [projects, setProjects] = React.useState(initialProjects)

  React.useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  function updateProjects(next: ViewerProjectOption[]) {
    setProjects(next)
    onProjectsChange?.(next)
  }

  async function refreshProjects() {
    const res = await fetch('/api/projects')
    if (!res.ok) return
    const data = (await res.json()) as { projects?: ViewerProjectOption[] }
    const next = data.projects ?? []
    updateProjects(next)
    router.refresh()
  }

  return (
    <div className='space-y-4'>
      {projects.length === 0 && !canCreateProject ? (
        <p className='text-muted-foreground text-sm'>
          No projects assigned yet. Ask your administrator to add you.
        </p>
      ) : null}

      {projects.length > 0 ? (
        <div className='divide-y divide-border rounded-2xl border border-border bg-muted/30'>
          {projects.map(p => (
            <WorkspaceEnterLink
              key={p._id}
              href={buildWorkspaceEnterHref('projects', p._id)}
              icon={<Container strokeWidth={0.75} />}
              name={p.name}
              meta={formatProjectMemberCount(p.memberCount ?? 0)}
              actionLabel='Join'
            />
          ))}
        </div>
      ) : null}

      {canCreateProject ? (
        <CreateProjectForm onCreated={() => void refreshProjects()} />
      ) : null}
    </div>
  )
}
