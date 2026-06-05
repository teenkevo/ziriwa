'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectMemberRosterRow } from '@/sanity/lib/projects/get-project-members-roster'
import {
  isProjectRole,
  PROJECT_ONBOARD_MEMBER_ROLES,
  PROJECT_ROLE_LABELS,
  projectRoleRequiresWorkstream,
} from '@/lib/project-role'
import {
  firstAvailableWorkstreamId,
  isWorkstreamLeadSlotTaken,
} from '@/lib/project-workstream-assignment'
import { WorkstreamSelectItems } from '@/features/projects/components/workstream-select-items'

const editMemberSchema = z
  .object({
    role: z
      .string()
      .min(1, 'Choose a role')
      .refine(isProjectRole, { message: 'Choose a role' }),
    workstreamId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      isProjectRole(data.role) &&
      projectRoleRequiresWorkstream(data.role) &&
      !data.workstreamId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Workstream is required',
        path: ['workstreamId'],
      })
    }
  })

type EditMemberFormValues = z.infer<typeof editMemberSchema>

interface WorkstreamOption {
  _id: string
  name: string
}

interface EditProjectMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  member: ProjectMemberRosterRow | null
  workstreams: WorkstreamOption[]
  hasProjectManager: boolean
  hasDeputyProjectManager: boolean
  occupiedWorkstreamLeadIds?: Set<string>
  onSuccess?: () => void
}

export function EditProjectMemberDialog({
  open,
  onOpenChange,
  projectId,
  member,
  workstreams,
  hasProjectManager,
  hasDeputyProjectManager,
  occupiedWorkstreamLeadIds,
  onSuccess,
}: EditProjectMemberDialogProps) {
  const form = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      role: 'workstream_member' as EditMemberFormValues['role'],
      workstreamId: '',
    },
    mode: 'onChange',
  })

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const isWorkstreamLeadRole = selectedRole === 'workstream_lead'
  const showWorkstream =
    isProjectRole(selectedRole) && projectRoleRequiresWorkstream(selectedRole)
  const allowedWorkstreamId =
    member?.projectRole === 'workstream_lead'
      ? (member.workstreamId ?? undefined)
      : undefined

  React.useEffect(() => {
    if (!open || !member) return
    form.reset({
      role: member.projectRole,
      workstreamId: member.workstreamId ?? '',
    })
  }, [open, member, form])

  React.useEffect(() => {
    if (showWorkstream && workstreams.length > 0) {
      const current = form.getValues('workstreamId')
      const occupied = isWorkstreamLeadRole ? occupiedWorkstreamLeadIds : undefined
      const currentTaken =
        !!current &&
        !!occupied &&
        isWorkstreamLeadSlotTaken(current, occupied, allowedWorkstreamId)
      if (
        !current ||
        !workstreams.some(w => w._id === current) ||
        currentTaken
      ) {
        const next = occupied
          ? firstAvailableWorkstreamId(
              workstreams,
              occupied,
              allowedWorkstreamId,
            )
          : workstreams[0]._id
        form.setValue('workstreamId', next, { shouldValidate: true })
      }
    } else if (!showWorkstream) {
      form.setValue('workstreamId', '')
    }
  }, [
    showWorkstream,
    workstreams,
    form,
    isWorkstreamLeadRole,
    occupiedWorkstreamLeadIds,
    allowedWorkstreamId,
  ])

  const isSaving = form.formState.isSubmitting

  const onSubmit = async (values: EditMemberFormValues) => {
    if (!member) return
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${member.memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: values.role,
            ...(values.workstreamId?.trim()
              ? { workstreamId: values.workstreamId.trim() }
              : {}),
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to update project member',
        )
      }
      toast.success('Project member updated')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update project member',
      )
    }
  }

  if (!member) return null

  return (
    <DialogContent disableClose={isSaving}>
      <DialogHeader>
        <DialogTitle>Edit project member</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.stopPropagation()
            form.handleSubmit(onSubmit)(e)
          }}
        >
          <div className='space-y-4 py-2 pb-4'>
            <div className='rounded-md border bg-muted/40 px-3 py-2'>
              <p className='text-sm font-medium'>{member.fullName}</p>
              {member.email ? (
                <p className='text-xs text-muted-foreground'>{member.email}</p>
              ) : null}
            </div>
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Project role</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={v => {
                      field.onChange(v)
                      if (!isProjectRole(v) || !projectRoleRequiresWorkstream(v)) {
                        form.setValue('workstreamId', '')
                      } else if (
                        workstreams.length > 0 &&
                        !form.getValues('workstreamId')
                      ) {
                        form.setValue('workstreamId', workstreams[0]._id, {
                          shouldValidate: true,
                        })
                      }
                    }}
                    disabled={isSaving}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Choose a role' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROJECT_ONBOARD_MEMBER_ROLES.map(role => {
                        const isPmTaken =
                          hasProjectManager && role === 'project_manager'
                        const isDpmTaken =
                          hasDeputyProjectManager &&
                          role === 'deputy_project_manager'
                        const isTaken = isPmTaken || isDpmTaken
                        return (
                          <SelectItem
                            key={role}
                            value={role}
                            disabled={isTaken}
                            className={
                              isTaken
                                ? 'pointer-events-none opacity-50'
                                : undefined
                            }
                          >
                            {PROJECT_ROLE_LABELS[role]}
                            {isTaken ? ' (already assigned)' : ''}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showWorkstream ? (
              <FormField
                control={form.control}
                name='workstreamId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Workstream</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isSaving || workstreams.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select workstream…' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <WorkstreamSelectItems
                          workstreams={workstreams}
                          occupiedWorkstreamIds={
                            isWorkstreamLeadRole
                              ? occupiedWorkstreamLeadIds
                              : undefined
                          }
                          allowedWorkstreamId={allowedWorkstreamId}
                        />
                      </SelectContent>
                    </Select>
                    {workstreams.length === 0 ? (
                      <p className='text-xs text-muted-foreground'>
                        Add a workstream before assigning this role.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !form.formState.isValid}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
