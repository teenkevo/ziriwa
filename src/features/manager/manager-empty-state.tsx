import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ManagerEmptyStateProps {
  variant?: 'mainstream' | 'project'
}

export function ManagerEmptyState({ variant = 'mainstream' }: ManagerEmptyStateProps) {
  const isProject = variant === 'project'

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-4 pt-6 md:p-8'>
      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>
            {isProject ? 'No project access' : 'No section assigned'}
          </CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          {isProject
            ? 'Your account is not assigned to this project or workstream. Ask your project manager to add you as a project member.'
            : 'Your account is not currently attached to a section as a manager, supervisor, or section staff member. Once a section is assigned, this workspace will open with your dashboard.'}
        </CardContent>
      </Card>
    </div>
  )
}
