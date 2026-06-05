'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isValidPhoneNumber } from 'react-phone-number-input'
import { useRouter } from 'next/navigation'

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
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { toast } from 'sonner'
import {
  isUraEmailEnforced,
  staffEmailRequirementMessage,
  URA_EMAIL_SUFFIX,
} from '@/lib/staff-email-policy'
import {
  isProjectRole,
  PROJECT_ONBOARD_MEMBER_ROLES,
  PROJECT_ROLE_LABELS,
  projectRoleRequiresWorkstream,
  type ProjectRole,
} from '@/lib/project-role'
import { isWorkstreamLeadSlotTaken } from '@/lib/project-workstream-assignment'
import { cn } from '@/lib/utils'
import {
  getProjectMemberEmailConflict,
  getWorkstreamMemberEmailConflictFromRoster,
  projectMemberEmailConflictMessage,
  workstreamMemberEmailConflictMessage,
} from '@/lib/project-member-email'
import { WorkstreamLeadWorkstreamPicker } from '@/features/projects/components/workstream-lead-workstream-picker'
import { WorkstreamSelectItems } from '@/features/projects/components/workstream-select-items'

const PROJECT_STAFF_LEVEL_OPTIONS = PROJECT_ONBOARD_MEMBER_ROLES.map(
  role => ({
    value: role,
    title: PROJECT_ROLE_LABELS[role],
  }),
)

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email')

const projectMemberSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    idNumber: z.string().min(1, 'ID number is required'),
    email: isUraEmailEnforced()
      ? emailSchema.refine(
          val => val.toLowerCase().endsWith(URA_EMAIL_SUFFIX),
          staffEmailRequirementMessage(),
        )
      : emailSchema,
    role: z
      .string()
      .min(1, 'Choose a role')
      .refine(isProjectRole, { message: 'Choose a role' }),
    workstreamId: z.string().optional(),
    phone: z
      .string()
      .optional()
      .refine(
        val => !val || isValidPhoneNumber(val),
        'Enter valid phone number',
      ),
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

const pendingWorkstreamLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  email: isUraEmailEnforced()
    ? emailSchema.refine(
        val => val.toLowerCase().endsWith(URA_EMAIL_SUFFIX),
        staffEmailRequirementMessage(),
      )
    : emailSchema,
  role: z.string().optional(),
  workstreamId: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      val => !val || isValidPhoneNumber(val),
      'Enter valid phone number',
    ),
})

type ProjectMemberFormValues = z.infer<typeof projectMemberSchema>
type PendingLeadFormValues = z.infer<typeof pendingWorkstreamLeadSchema>
type MemberFormValues = ProjectMemberFormValues | PendingLeadFormValues

interface WorkstreamOption {
  _id: string
  name: string
}

interface ProjectMemberEmailRow {
  email?: string | null
  status: string
  workstreamId?: string | null
}

interface CreateProjectMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  workstreams: WorkstreamOption[]
  /** Existing project members — used to block duplicate emails client-side. */
  memberRoster?: ProjectMemberEmailRow[]
  /** When true, Project Manager cannot be selected (one per project). */
  hasProjectManager?: boolean
  /** When true, Deputy Project Manager cannot be selected (one per project). */
  hasDeputyProjectManager?: boolean
  /** Workstreams that already have an active lead (one lead per workstream). */
  occupiedWorkstreamLeadIds?: Set<string>
  /** Hide role picker and always submit this role. */
  lockedRole?: ProjectRole
  /** Workstream lead added before the workstream exists (create workstream flow). */
  pendingWorkstreamLead?: boolean
  /** When set, workstream is preselected and cannot be changed (e.g. editing a workstream). */
  fixedWorkstreamId?: string
  fixedWorkstreamName?: string
  onMemberCreated?: (member: { staffId: string; fullName: string }) => void
  onSuccess?: () => void
}

export function CreateProjectMemberDialog({
  open,
  onOpenChange,
  projectId,
  workstreams,
  memberRoster = [],
  hasProjectManager = false,
  hasDeputyProjectManager = false,
  occupiedWorkstreamLeadIds,
  lockedRole,
  pendingWorkstreamLead = false,
  fixedWorkstreamId,
  fixedWorkstreamName,
  onMemberCreated,
  onSuccess,
}: CreateProjectMemberDialogProps) {
  const router = useRouter()
  const [workstreamOptions, setWorkstreamOptions] =
    React.useState<WorkstreamOption[]>(workstreams)
  const [isCheckingEmail, setIsCheckingEmail] = React.useState(false)
  const isLeadOnlyFlow =
    lockedRole === 'workstream_lead' && pendingWorkstreamLead
  const isWorkstreamMemberOnlyFlow = lockedRole === 'workstream_member'
  const hasFixedWorkstream = Boolean(fixedWorkstreamId)
  const shouldCheckWorkstreamEmail =
    isWorkstreamMemberOnlyFlow && Boolean(fixedWorkstreamId)

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(
      isLeadOnlyFlow ? pendingWorkstreamLeadSchema : projectMemberSchema,
    ),
    defaultValues: {
      firstName: '',
      lastName: '',
      idNumber: '',
      email: '',
      role: (lockedRole ?? '') as ProjectMemberFormValues['role'],
      workstreamId: '',
      phone: '',
    },
    mode: 'onChange',
  })

  const { setError, clearErrors, getFieldState, reset } = form

  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const emailValue = useWatch({ control: form.control, name: 'email' })
  const effectiveRole = lockedRole ?? selectedRole
  const isWorkstreamLeadRole = effectiveRole === 'workstream_lead'
  const showWorkstream =
    !isLeadOnlyFlow &&
    isProjectRole(effectiveRole) &&
    projectRoleRequiresWorkstream(effectiveRole)

  React.useEffect(() => {
    setWorkstreamOptions(workstreams)
  }, [workstreams])

  const handleWorkstreamCreated = React.useCallback(
    (workstream: WorkstreamOption) => {
      setWorkstreamOptions(current => {
        if (current.some(w => w._id === workstream._id)) return current
        return [...current, workstream].sort((a, b) =>
          a.name.localeCompare(b.name),
        )
      })
      form.setValue('workstreamId', workstream._id, { shouldValidate: true })
    },
    [form],
  )

  React.useEffect(() => {
    const role = form.getValues('role')
    if (hasProjectManager && role === 'project_manager') {
      form.resetField('role')
    }
    if (hasDeputyProjectManager && role === 'deputy_project_manager') {
      form.resetField('role')
    }
  }, [hasProjectManager, hasDeputyProjectManager, form])

  React.useEffect(() => {
    if (!open) {
      setIsCheckingEmail(false)
      return
    }
    reset({
      firstName: '',
      lastName: '',
      idNumber: '',
      email: '',
      role: (lockedRole ?? '') as ProjectMemberFormValues['role'],
      workstreamId: fixedWorkstreamId ?? '',
      phone: '',
    })
  }, [open, reset, lockedRole, fixedWorkstreamId])

  React.useEffect(() => {
    if (!open || !shouldCheckWorkstreamEmail || !fixedWorkstreamId) {
      setIsCheckingEmail(false)
      return
    }

    const trimmed = emailValue?.trim() ?? ''
    const isValidEmail = emailSchema.safeParse(trimmed).success
    if (!isValidEmail) {
      setIsCheckingEmail(false)
      if (getFieldState('email').error?.type === 'duplicate') {
        clearErrors('email')
      }
      return
    }

    setIsCheckingEmail(true)
    const timeoutId = setTimeout(() => {
      const conflict = getWorkstreamMemberEmailConflictFromRoster(
        trimmed,
        memberRoster,
        fixedWorkstreamId,
      )
      if (conflict) {
        setError('email', {
          type: 'duplicate',
          message: workstreamMemberEmailConflictMessage(conflict),
        })
      } else if (getFieldState('email').error?.type === 'duplicate') {
        clearErrors('email')
      }
      setIsCheckingEmail(false)
    }, 400)

    return () => {
      clearTimeout(timeoutId)
      setIsCheckingEmail(false)
    }
  }, [
    open,
    emailValue,
    shouldCheckWorkstreamEmail,
    fixedWorkstreamId,
    memberRoster,
    setError,
    clearErrors,
    getFieldState,
  ])

  React.useEffect(() => {
    if (hasFixedWorkstream && fixedWorkstreamId) {
      form.setValue('workstreamId', fixedWorkstreamId, { shouldValidate: true })
      return
    }

    if (showWorkstream && workstreamOptions.length > 0) {
      const current = form.getValues('workstreamId')
      const occupied = isWorkstreamLeadRole ? occupiedWorkstreamLeadIds : undefined
      const currentTaken =
        !!current &&
        !!occupied &&
        isWorkstreamLeadSlotTaken(current, occupied)
      const currentInvalid =
        !current ||
        !workstreamOptions.some(w => w._id === current) ||
        currentTaken

      if (isWorkstreamLeadRole) {
        if (currentInvalid && current) {
          form.setValue('workstreamId', '', { shouldValidate: true })
        }
      } else if (currentInvalid) {
        form.setValue('workstreamId', workstreamOptions[0]._id, {
          shouldValidate: true,
        })
      }
    } else if (!hasFixedWorkstream) {
      form.setValue('workstreamId', '')
    }
  }, [
    showWorkstream,
    workstreamOptions,
    form,
    isWorkstreamLeadRole,
    occupiedWorkstreamLeadIds,
    hasFixedWorkstream,
    fixedWorkstreamId,
  ])

  const isCreating = form.formState.isSubmitting

  const onSubmit = async (values: MemberFormValues) => {
    const role = (lockedRole ?? ('role' in values ? values.role : '')) as ProjectRole
    const email = 'email' in values ? values.email : ''

    if (shouldCheckWorkstreamEmail && fixedWorkstreamId) {
      if (getFieldState('email').error || isCheckingEmail) {
        return
      }
      const workstreamConflict = getWorkstreamMemberEmailConflictFromRoster(
        email,
        memberRoster,
        fixedWorkstreamId,
      )
      if (workstreamConflict) {
        setError('email', {
          type: 'duplicate',
          message: workstreamMemberEmailConflictMessage(workstreamConflict),
        })
        return
      }
    } else {
      const emailConflict = getProjectMemberEmailConflict(email, memberRoster)
      if (emailConflict) {
        toast.error(projectMemberEmailConflictMessage(emailConflict))
        return
      }
    }

    try {
      const resolvedWorkstreamId =
        fixedWorkstreamId?.trim() ||
        (values.workstreamId?.trim() && !isLeadOnlyFlow
          ? values.workstreamId.trim()
          : '')

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          idNumber: values.idNumber.trim(),
          email: values.email.trim().toLowerCase(),
          role,
          phone: values.phone?.trim() || undefined,
          ...(resolvedWorkstreamId ? { workstreamId: resolvedWorkstreamId } : {}),
          ...(isLeadOnlyFlow ? { pendingWorkstreamLead: true } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to create project member',
        )
      }
      const data = (await res.json()) as {
        staffId?: string
        fullName?: string
        invited?: boolean
        resent?: boolean
        existingClerkUser?: boolean
      }
      const staffId = data.staffId ?? ''
      const fullName =
        data.fullName?.trim() ||
        `${values.firstName.trim()} ${values.lastName.trim()}`.trim()
      form.reset()
      onOpenChange(false)
      const createdLabel = isLeadOnlyFlow
        ? 'Workstream lead added'
        : isWorkstreamMemberOnlyFlow
          ? 'Workstream member added'
          : 'Project member created'
      const inviteLabel = data.resent
        ? 'Invitation re-sent'
        : 'Invitation sent'
      toast.success(
        data.invited
          ? `${createdLabel} — ${inviteLabel}`
          : data.existingClerkUser
            ? `${createdLabel} — they already have an account and can sign in`
            : createdLabel,
      )
      if (staffId) {
        onMemberCreated?.({ staffId, fullName })
      }
      onSuccess?.()
      if (!onMemberCreated) {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to create project member',
      )
    }
  }

  return (
    <DialogContent disableClose={isCreating}>
      <DialogHeader>
        <DialogTitle>
          {isLeadOnlyFlow
            ? 'Add workstream lead'
            : isWorkstreamMemberOnlyFlow
              ? 'Add workstream member'
              : 'Create project member'}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.stopPropagation()
            form.handleSubmit(onSubmit)(e)
          }}
        >
          <div className='space-y-4 py-2 pb-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isCreating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isCreating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='idNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>ID Number</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isCreating} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        {...field}
                        type='email'
                        placeholder={
                          isUraEmailEnforced()
                            ? `e.g. name${URA_EMAIL_SUFFIX}`
                            : 'e.g. name@example.com'
                        }
                        disabled={isCreating}
                        className={cn(
                          shouldCheckWorkstreamEmail && 'pr-9',
                          fieldState.invalid &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                        onBlur={e => {
                          field.onBlur()
                          if (shouldCheckWorkstreamEmail) return
                          const conflict = getProjectMemberEmailConflict(
                            e.target.value,
                            memberRoster,
                          )
                          if (conflict) {
                            form.setError('email', {
                              message: projectMemberEmailConflictMessage(conflict),
                            })
                          } else {
                            form.clearErrors('email')
                          }
                        }}
                      />
                      {shouldCheckWorkstreamEmail && isCheckingEmail ? (
                        <div className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2'>
                          <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                        </div>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!lockedRole ? (
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Staff Level</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={v => {
                        field.onChange(v)
                        if (
                          !isProjectRole(v) ||
                          !projectRoleRequiresWorkstream(v)
                        ) {
                          form.setValue('workstreamId', '')
                        } else if (v === 'workstream_lead') {
                          form.setValue('workstreamId', '')
                        } else if (
                          workstreamOptions.length > 0 &&
                          !form.getValues('workstreamId')
                        ) {
                          form.setValue('workstreamId', workstreamOptions[0]._id, {
                            shouldValidate: true,
                          })
                        }
                      }}
                      disabled={isCreating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Choose a role' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STAFF_LEVEL_OPTIONS.map(opt => {
                          const isPmTaken =
                            hasProjectManager && opt.value === 'project_manager'
                          const isDpmTaken =
                            hasDeputyProjectManager &&
                            opt.value === 'deputy_project_manager'
                          const isTaken = isPmTaken || isDpmTaken
                          return (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              disabled={isTaken}
                              className={
                                isTaken
                                  ? 'pointer-events-none opacity-50'
                                  : undefined
                              }
                            >
                              {opt.title}
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
            ) : null}
            {showWorkstream ? (
              <FormField
                control={form.control}
                name='workstreamId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Workstream</FormLabel>
                    {hasFixedWorkstream ? (
                      <FormControl>
                        <Input
                          value={
                            fixedWorkstreamName ??
                            workstreamOptions.find(
                              w => w._id === fixedWorkstreamId,
                            )?.name ??
                            'Workstream'
                          }
                          disabled
                          readOnly
                        />
                      </FormControl>
                    ) : isWorkstreamLeadRole ? (
                      <FormControl>
                        <WorkstreamLeadWorkstreamPicker
                          projectId={projectId}
                          workstreams={workstreamOptions}
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          occupiedWorkstreamIds={occupiedWorkstreamLeadIds}
                          onWorkstreamCreated={handleWorkstreamCreated}
                          disabled={isCreating}
                        />
                      </FormControl>
                    ) : (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={isCreating || workstreamOptions.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select workstream…' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <WorkstreamSelectItems
                            workstreams={workstreamOptions}
                          />
                        </SelectContent>
                      </Select>
                    )}
                    {workstreamOptions.length === 0 && !isWorkstreamLeadRole ? (
                      <p className='text-xs text-muted-foreground'>
                        Add a workstream on Setup before assigning this role.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <PhoneInput
                      defaultCountry='UG'
                      disabled={isCreating}
                      placeholder='e.g. +256 792 445002'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={
                isCreating || !form.formState.isValid || isCheckingEmail
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : isWorkstreamMemberOnlyFlow ? (
                'Add member'
              ) : (
                'Create member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
