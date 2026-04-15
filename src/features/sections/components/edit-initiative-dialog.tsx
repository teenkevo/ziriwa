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

const INITIATIVE_CODE_REGEX = /^\d+\.\d+\.\d+$/

const initiativeSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(
      INITIATIVE_CODE_REGEX,
      'Code must match format 1.1.1, 1.1.2, 1.1.3',
    ),
  title: z.string().min(1, 'Initiative is required'),
})

type InitiativeFormValues = z.infer<typeof initiativeSchema>

export function EditInitiativeDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  initialCode,
  initialTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  initiativeIndex: number
  initialCode: string
  initialTitle: string
}) {
  const router = useRouter()

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: { code: initialCode, title: initialTitle },
    mode: 'onChange',
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ code: initialCode, title: initialTitle })
  }, [open, form, initialCode, initialTitle])

  const isSaving = form.formState.isSubmitting

  const onSubmit = async (values: InitiativeFormValues) => {
    try {
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateInitiative',
          payload: {
            objectiveIndex,
            initiativeIndex,
            code: values.code.trim(),
            title: values.title.trim(),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update initiative')
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update initiative')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Initiative</DialogTitle>
          <DialogDescription>Update the initiative code or text.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className='space-y-4 py-2 pb-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel required>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='e.g. 1.1.1'
                        disabled={isSaving}
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
                    <FormLabel required>Initiative</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='e.g. Sectional Performance Contracts Completion'
                        disabled={isSaving}
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
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isSaving || !form.formState.isValid}>
                {isSaving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

