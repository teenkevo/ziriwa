'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isValidPhoneNumber } from 'react-phone-number-input'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle } from 'lucide-react'

const memberSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .refine(val => isValidPhoneNumber(val), 'Enter valid phone number'),
  contributionTier: z.string().min(1, 'Contribution tier is required'),
})

type MemberFormValues = z.infer<typeof memberSchema>

export function AddMemberDialog() {
  const [open, setOpen] = useState(false)

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      contributionTier: '',
    },
    mode: 'onChange',
  })

  const handleSubmit = (data: MemberFormValues) => {
    // Form submission logic when enabled
    console.log(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled>
          <PlusCircle /> Add New member
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Enter the details of the new member to add them to the investment
            club.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className='space-y-4 py-4'>
              <FormField
                control={form.control}
                name='fullName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} type='email' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        defaultCountry='UG'
                        placeholder='e.g. +256 792 445002'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='contributionTier'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Contribution Tier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a tier' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          50000, 100000, 150000, 200000, 250000, 300000, 350000,
                        ].map(tier => (
                          <SelectItem key={tier} value={tier.toString()}>
                            {tier.toLocaleString()} UGX
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type='submit' disabled={!form.formState.isValid}>
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
