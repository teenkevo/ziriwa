'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isValidPhoneNumber } from 'react-phone-number-input'

import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
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
import { STAFF_ROLE_OPTIONS, URA_EMAIL_SUFFIX } from '@/lib/staff-roles'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
}

const staffSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email')
    .refine(
      val => val.toLowerCase().endsWith(URA_EMAIL_SUFFIX),
      `Email must end with ${URA_EMAIL_SUFFIX}`,
    ),
  role: z.string().min(1, 'Staff level is required'),
  phone: z
    .string()
    .optional()
    .refine(val => !val || isValidPhoneNumber(val), 'Enter valid phone number'),
})

type StaffFormValues = z.infer<typeof staffSchema>

interface CreateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fixedRole?: string
  fixedSectionId?: string
  onSuccess?: (staff: StaffMember) => void
}

export function CreateStaffDialog({
  open,
  onOpenChange,
  fixedRole = 'assistant_commissioner',
  fixedSectionId,
  onSuccess,
}: CreateStaffDialogProps) {
  const isRoleFixed = !!fixedRole

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      idNumber: '',
      email: '',
      role: fixedRole,
      phone: '',
    },
    mode: 'onChange',
  })

  React.useEffect(() => {
    if (open) {
      form.setValue('role', fixedRole)
    }
  }, [open, fixedRole, form])

  const isCreating = form.formState.isSubmitting

  const onSubmit = async (values: StaffFormValues) => {
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          idNumber: values.idNumber.trim(),
          email: values.email.trim().toLowerCase(),
          role: isRoleFixed ? fixedRole : values.role,
          phone: values.phone?.trim() || undefined,
          sectionId: fixedSectionId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create staff')
      }
      const { id, fullName } = await res.json()
      const newStaff: StaffMember = { _id: id, fullName }
      form.reset()
      onOpenChange(false)
      onSuccess?.(newStaff)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create staff')
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Staff</DialogTitle>
        <DialogDescription>
          Add a new staff member to ITID. Email must end with @ura.go.ug.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder={`e.g. name${URA_EMAIL_SUFFIX}`}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Staff Level</FormLabel>
                  <Select
                    value={isRoleFixed ? fixedRole : field.value}
                    onValueChange={v => !isRoleFixed && field.onChange(v)}
                    disabled={isCreating || isRoleFixed}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select level' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STAFF_ROLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              disabled={isCreating || !form.formState.isValid}
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Staff'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
