'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const initiativeSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^\d+\.\d+\.\d+$/, 'Code must match format 1.1.1, 1.1.2, 1.1.3'),
  title: z.string().min(1, 'Initiative is required'),
})

type InitiativeFormValues = z.infer<typeof initiativeSchema>

interface AddInitiativeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  nextOrder: number
  onSuccess?: () => void
}

export function AddInitiativeDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  nextOrder,
  onSuccess,
}: AddInitiativeDialogProps) {
  const router = useRouter()

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: { code: '', title: '' },
    mode: 'onChange',
  })

  React.useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  const isCreating = form.formState.isSubmitting

  const onSubmit = async (values: InitiativeFormValues) => {
    try {
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'addInitiative',
          payload: {
            objectiveIndex,
            code: values.code.trim(),
            title: values.title.trim(),
            order: nextOrder,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add initiative')
      }
      form.reset()
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to add initiative')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Initiative</DialogTitle>
          <DialogDescription>
            Add an initiative. Measurable activities (KPI or Cross-cutting) will
            be added under each initiative.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className='space-y-4 py-2 pb-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='e.g. 1.1.1'
                        disabled={isCreating}
                        className={cn(
                          fieldState.invalid &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Acceptable format: 1.1.1, 1.1.2, 1.1.3
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='title'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Initiative</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='e.g. Sectional Performance Contracts Completion'
                        disabled={isCreating}
                        rows={4}
                        className={cn(
                          'resize-none',
                          fieldState.invalid &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
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
              <Button type='submit' disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Adding...
                  </>
                ) : (
                  'Add Initiative'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
