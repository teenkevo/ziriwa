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

interface AddObjectiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  onSuccess?: () => void
}

export function AddObjectiveDialog({
  open,
  onOpenChange,
  sectionContractId,
  onSuccess,
}: AddObjectiveDialogProps) {
  const router = useRouter()
  const [isCheckingCode, setIsCheckingCode] = React.useState(false)
  const checkAbortRef = React.useRef<AbortController | null>(null)

  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: { code: '', title: '' },
    mode: 'onChange',
  })

  const codeValue = form.watch('code')

  React.useEffect(() => {
    if (!open) {
      form.reset()
      setIsCheckingCode(false)
      checkAbortRef.current?.abort()
    }
  }, [open, form])

  React.useEffect(() => {
    const trimmed = codeValue?.trim() ?? ''
    if (!OBJECTIVE_CODE_REGEX.test(trimmed)) {
      form.clearErrors('code')
      return
    }
    const t = setTimeout(async () => {
      checkAbortRef.current?.abort()
      checkAbortRef.current = new AbortController()
      const signal = checkAbortRef.current.signal
      setIsCheckingCode(true)
      form.clearErrors('code')
      try {
        const res = await fetch(
          `/api/section-contracts/${sectionContractId}/codes`,
          { signal },
        )
        if (!res.ok) return
        const data = await res.json()
        const existing = (data.objectiveCodes ?? []) as string[]
        if (existing.includes(trimmed)) {
          form.setError('code', {
            type: 'duplicate',
            message: `SSMARTA objective with code "${trimmed}" already exists`,
          })
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') throw e
      } finally {
        setIsCheckingCode(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [codeValue, sectionContractId, form])

  const isCreating = form.formState.isSubmitting

  const onSubmit = async (values: ObjectiveFormValues) => {
    try {
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'addObjective',
          payload: { code: values.code.trim(), title: values.title.trim() },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add objective')
      }
      form.reset()
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to add objective')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add SSMARTA Objective</DialogTitle>
          <DialogDescription>
            Add a top-level objective. Initiatives will be added under each
            objective.
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
                      <div className='relative'>
                        <Input
                          {...field}
                          placeholder='e.g. 1.1'
                          disabled={isCreating}
                          className={cn(
                            'pr-9',
                            fieldState.invalid &&
                              'border-destructive focus-visible:ring-destructive',
                          )}
                        />
                        {isCheckingCode && (
                          <div className='absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none'>
                            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                          </div>
                        )}
                      </div>
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
              <Button
                type='submit'
                disabled={isCreating || !form.formState.isValid}
              >
                {isCreating ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Adding...
                  </>
                ) : (
                  'Add Objective'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
