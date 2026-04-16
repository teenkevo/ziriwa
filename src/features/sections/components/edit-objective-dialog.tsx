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

const OBJECTIVE_CODE_REGEX = /^\d+\.\d+$/

const objectiveSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(OBJECTIVE_CODE_REGEX, 'Code must match format 1.1, 1.2, 2.1'),
  title: z.string().min(1, 'SSMARTA objective is required'),
})

type ObjectiveFormValues = z.infer<typeof objectiveSchema>

export function EditObjectiveDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initialCode,
  initialTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  initialCode: string
  initialTitle: string
}) {
  const router = useRouter()

  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: { code: initialCode, title: initialTitle },
    mode: 'onChange',
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ code: initialCode, title: initialTitle })
  }, [open, form, initialCode, initialTitle])

  const isSaving = form.formState.isSubmitting

  const onSubmit = async (values: ObjectiveFormValues) => {
    try {
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateObjective',
          payload: {
            objectiveIndex,
            code: values.code.trim(),
            title: values.title.trim(),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update objective')
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update objective')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit SSMARTA Objective</DialogTitle>
          <DialogDescription>
            Update the objective code or text. Changing the code renumbers initiatives
            under this objective to keep the same structure (e.g. 4.1.x becomes 5.2.x).
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
                    <FormLabel required>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='e.g. 1.1'
                        disabled={isSaving}
                        className={cn(
                          fieldState.invalid &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Acceptable format: 1.1, 1.2, 2.1
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
                    <FormLabel required>SSMARTA objective</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='e.g. Enhance performance management systems'
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

