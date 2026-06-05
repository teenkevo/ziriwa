'use client'

import * as React from 'react'
import { Container, CopyCheck } from 'lucide-react'

import { ProjectPickerContent } from '@/features/workspace/project-picker-content'
import { WorkspaceEnterLink } from '@/features/workspace/workspace-enter-link'
import { WorkspaceOptionRow } from '@/features/workspace/workspace-option-row'
import { WorkspaceProjectsSkeleton } from '@/features/workspace/workspace-projects-skeleton'
import { WorkspaceSelectionShell } from '@/features/workspace/workspace-selection-shell'
import { buildWorkspaceEnterHref } from '@/lib/workspace-mode'
import { cn } from '@/lib/utils'
import type { ViewerProjectOption } from '@/sanity/lib/projects/get-projects-for-viewer'

type WorkspaceStep = 'choose' | 'projects'

interface WorkspaceFlowProps {
  initialStep?: WorkspaceStep
  /** Viewer has mainstream (section/org) access. */
  canJoinMainstream: boolean
  /** Viewer has project memberships or may create projects. */
  canJoinProjects: boolean
  projects: ViewerProjectOption[]
  canCreateProject?: boolean
}

function WorkspaceStepPanel({
  panelKey,
  children,
}: {
  panelKey: string
  children: React.ReactNode
}) {
  return (
    <div
      key={panelKey}
      className={cn(
        'w-full animate-in fade-in-0 duration-300',
        'slide-in-from-right-3',
      )}
    >
      {children}
    </div>
  )
}

export function WorkspaceFlow({
  initialStep = 'choose',
  canJoinMainstream,
  canJoinProjects,
  projects: initialProjects,
  canCreateProject = false,
}: WorkspaceFlowProps) {
  const [step, setStep] = React.useState<WorkspaceStep>(initialStep)
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false)
  const [projects, setProjects] = React.useState(initialProjects)

  React.useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  React.useEffect(() => {
    setStep(initialStep)
  }, [initialStep])

  React.useEffect(() => {
    function onPopState() {
      const path = window.location.pathname
      if (path === '/workspace' || path.endsWith('/workspace')) {
        setIsLoadingProjects(false)
        setStep('choose')
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function handleOpenProjects() {
    if (!canJoinProjects) return
    setIsLoadingProjects(true)
    window.setTimeout(() => {
      setIsLoadingProjects(false)
      setStep('projects')
      window.history.pushState(null, '', '/workspace/projects')
    }, 280)
  }

  function handleBackToChoose() {
    setIsLoadingProjects(false)
    setStep('choose')
    window.history.replaceState(null, '', '/workspace')
  }

  const panelKey = isLoadingProjects ? 'loading' : step

  const title =
    panelKey === 'choose'
      ? 'Choose a workspace'
      : panelKey === 'loading'
        ? 'Loading your projects…'
        : 'Select a project'
  const subtitle =
    panelKey === 'choose'
      ? 'Pick mainstream for core contracts, or projects for delivery workstreams.'
      : panelKey === 'loading'
        ? undefined
        : projects.length > 0 || canCreateProject
          ? 'Open the project you need to work in.'
          : undefined

  const mainstreamEnterHref = buildWorkspaceEnterHref('mainstream')

  return (
    <WorkspaceSelectionShell
      title={title}
      subtitle={subtitle}
      onBack={step === 'projects' ? handleBackToChoose : undefined}
    >
      <div className='relative min-h-[12rem] overflow-hidden'>
        {panelKey === 'choose' ? (
          <WorkspaceStepPanel panelKey='choose'>
            <div className='divide-y divide-border rounded-2xl border border-border bg-muted/30'>
              <WorkspaceEnterLink
                href={mainstreamEnterHref}
                icon={<CopyCheck strokeWidth={0.75} />}
                name='Mainstream'
                meta={
                  canJoinMainstream
                    ? 'Core contract workspace'
                    : 'No department access assigned'
                }
                actionLabel='Join'
                disabled={!canJoinMainstream}
              />
              <WorkspaceOptionRow
                icon={<Container strokeWidth={0.75} />}
                name='Projects'
                meta={
                  canJoinProjects
                    ? 'Project-related workspace'
                    : 'No project memberships assigned'
                }
                onClick={handleOpenProjects}
                disabled={!canJoinProjects}
                actionLabel='Join'
              />
            </div>
          </WorkspaceStepPanel>
        ) : null}
        {panelKey === 'loading' ? (
          <WorkspaceStepPanel panelKey='loading'>
            <WorkspaceProjectsSkeleton />
          </WorkspaceStepPanel>
        ) : null}
        {panelKey === 'projects' ? (
          <WorkspaceStepPanel panelKey='projects'>
            <ProjectPickerContent
              projects={projects}
              canCreateProject={canCreateProject}
              onProjectsChange={setProjects}
            />
          </WorkspaceStepPanel>
        ) : null}
      </div>
    </WorkspaceSelectionShell>
  )
}
