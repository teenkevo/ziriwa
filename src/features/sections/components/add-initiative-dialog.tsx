'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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
import {
  buildInitiativeFormSchema,
  INITIATIVE_CODE_REGEX,
  type InitiativeFormValues,
} from '@/lib/contract-code-validation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface AddInitiativeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  /** Objective code prefix; initiatives must be {objectiveCode}.{n} (e.g. 4.1 → 4.1.1). */
  objectiveCode: string
  nextOrder: number
  onSuccess?: () => void
}

function AddInitiativeFormInner({
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  objectiveCode,
  nextOrder,
  onSuccess,
}: Omit<AddInitiativeDialogProps, 'open'>) {
  const router = useRouter()
  const [isCheckingCode, setIsCheckingCode] = React.useState(false)
  const checkAbortRef = React.useRef<AbortController | null>(null)

  const initiativeSchema = React.useMemo(
    () => buildInitiativeFormSchema(objectiveCode),
    [objectiveCode],
  )

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: { code: '', title: '' },
    mode: 'onChange',
  })

  const codeValue = form.watch('code')
  const oc = objectiveCode.trim() || '—'

  React.useEffect(() => {
    const trimmed = codeValue?.trim() ?? ''
    if (!INITIATIVE_CODE_REGEX.test(trimmed)) {
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
        const existing = (data.initiativesByObjective?.[objectiveIndex] ??
          []) as string[]
        if (existing.includes(trimmed)) {
          form.setError('code', {
            type: 'duplicate',
            message: `Initiative with code "${trimmed}" already exists.`,
          })
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') throw e
      } finally {
        setIsCheckingCode(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [codeValue, sectionContractId, objectiveIndex, form])

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
                      placeholder={`e.g. ${oc === '—' ? '1.1.1' : `${oc}.1`}`}
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
                  Three segments; must start with{' '}
                  <span className='font-mono'>{oc}</span>. (e.g.{' '}
                  <span className='font-mono'>
                    {oc === '—' ? '1.1.1' : `${oc}.1`}
                  </span>
                  ,{' '}
                  <span className='font-mono'>
                    {oc === '—' ? '1.1.2' : `${oc}.2`}
                  </span>
                  ).
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
              'Add Initiative'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export function AddInitiativeDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  objectiveCode,
  nextOrder,
  onSuccess,
}: AddInitiativeDialogProps) {
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
        {open ? (
          <AddInitiativeFormInner
            key={`${sectionContractId}-${objectiveIndex}-${objectiveCode}`}
            onOpenChange={onOpenChange}
            sectionContractId={sectionContractId}
            objectiveIndex={objectiveIndex}
            objectiveCode={objectiveCode}
            nextOrder={nextOrder}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
