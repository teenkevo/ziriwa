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
  type InitiativeFormValues,
} from '@/lib/contract-code-validation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface EditInitiativeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  initiativeIndex: number
  /** Objective code prefix; initiatives must be {objectiveCode}.{n}. */
  objectiveCode: string
  initialCode: string
  initialTitle: string
}

function EditInitiativeFormInner({
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  objectiveCode,
  initialCode,
  initialTitle,
}: Omit<EditInitiativeDialogProps, 'open'>) {
  const router = useRouter()

  const initiativeSchema = React.useMemo(
    () => buildInitiativeFormSchema(objectiveCode),
    [objectiveCode],
  )

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: { code: initialCode, title: initialTitle },
    mode: 'onChange',
  })

  React.useEffect(() => {
    form.reset({ code: initialCode, title: initialTitle })
  }, [form, initialCode, initialTitle])

  const isSaving = form.formState.isSubmitting
  const oc = objectiveCode.trim() || '—'

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
      await router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to update initiative')
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
                  <Input
                    {...field}
                    placeholder={
                      oc === '—' ? 'e.g. 1.1.1' : `e.g. ${oc}.1`
                    }
                    disabled={isSaving}
                    className={cn(
                      fieldState.invalid &&
                        'border-destructive focus-visible:ring-destructive',
                    )}
                  />
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
  )
}

export function EditInitiativeDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  objectiveCode,
  initialCode,
  initialTitle,
}: EditInitiativeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Initiative</DialogTitle>
          <DialogDescription>Update the initiative code or text.</DialogDescription>
        </DialogHeader>
        {open ? (
          <EditInitiativeFormInner
            key={`${sectionContractId}-${objectiveIndex}-${initiativeIndex}-${objectiveCode}`}
            onOpenChange={onOpenChange}
            sectionContractId={sectionContractId}
            objectiveIndex={objectiveIndex}
            initiativeIndex={initiativeIndex}
            objectiveCode={objectiveCode}
            initialCode={initialCode}
            initialTitle={initialTitle}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
