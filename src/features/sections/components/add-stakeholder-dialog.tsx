'use client'

import * as React from 'react'
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Target,
  Handshake,
  Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

const STAKEHOLDER_OPTIONS = [
  { value: 'regulatory_body', label: 'Regulatory body' },
  { value: 'community_leader', label: 'Community leader' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'partner_organization', label: 'Partner organization' },
  { value: 'internal', label: 'Internal (other division/section)' },
  { value: 'other', label: 'Other' },
]

const POWER_OPTIONS = [
  { value: 'H', label: 'High' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Low' },
]

const MODE_OPTIONS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'report', label: 'Report' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'phone_call', label: 'Phone call' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'other', label: 'Other' },
]

const STEPS = [
  { id: 1, title: 'Who', subtitle: 'Stakeholder details', icon: User },
  { id: 2, title: 'Why', subtitle: 'Objective & priority', icon: Target },
  { id: 3, title: 'Expectations', subtitle: 'What we expect', icon: Handshake },
  { id: 4, title: 'Resources', subtitle: 'Budget & delegation', icon: Wallet },
] as const

const TOTAL_STEPS = STEPS.length

/**
 * Priority is derived from Power and Interest.
 * Matrix: Power (row) × Interest (col) → Priority
 * L/L→L, L/M→L, L/H→M | M/L→L, M/M→M, M/H→H | H/L→M, H/M→H, H/H→H
 */
function computePriority(
  power: string,
  interest: string,
): 'H' | 'M' | 'L' | '' {
  const p = power as 'H' | 'M' | 'L'
  const i = interest as 'H' | 'M' | 'L'
  if (!['H', 'M', 'L'].includes(p) || !['H', 'M', 'L'].includes(i)) return ''
  const matrix: Record<string, Record<string, 'H' | 'M' | 'L'>> = {
    L: { L: 'L', M: 'L', H: 'M' },
    M: { L: 'L', M: 'M', H: 'H' },
    H: { L: 'M', M: 'H', H: 'H' },
  }
  return matrix[p][i]
}

type StaffOption = { _id: string; fullName?: string; staffId?: string }
type InitiativeOption = { code: string; title: string }

interface AddStakeholderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  staffOptions: StaffOption[]
  initiatives: InitiativeOption[]
  nextSn: number
  editingEntry?: StakeholderEntry | null
  editingIndex?: number
  onSuccess?: () => void
}

const emptyForm = {
  name: '',
  stakeholder: '',
  designation: '',
  phoneNumber: '',
  emailAddress: '',
  address: '',
  initiativeCode: '',
  objectiveOfEngagement: '',
  power: '',
  interest: '',
  priority: '',
  stakeholderExpectations: '',
  uraExpectations: '',
  proposedDateOfEngagement: '',
  modeOfEngagement: '',
  budgetHighlights: '',
  totalCost: '' as string | number,
  uraDelegation: '',
}

export function AddStakeholderDialog({
  open,
  onOpenChange,
  engagementId,
  staffOptions,
  initiatives,
  nextSn,
  editingEntry,
  editingIndex,
  onSuccess,
}: AddStakeholderDialogProps) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)

  const isEditing = !!editingEntry && typeof editingIndex === 'number'

  React.useEffect(() => {
    if (open) {
      setStep(1)
      if (editingEntry) {
        setForm({
          name: editingEntry.name ?? '',
          stakeholder: editingEntry.stakeholder ?? '',
          designation: editingEntry.designation ?? '',
          phoneNumber: editingEntry.phoneNumber ?? '',
          emailAddress: editingEntry.emailAddress ?? '',
          address: editingEntry.address ?? '',
          initiativeCode: editingEntry.initiativeCode ?? '',
          objectiveOfEngagement: editingEntry.objectiveOfEngagement ?? '',
          power: editingEntry.power ?? '',
          interest: editingEntry.interest ?? '',
          priority: editingEntry.priority ?? '',
          stakeholderExpectations: editingEntry.stakeholderExpectations ?? '',
          uraExpectations: editingEntry.uraExpectations ?? '',
          proposedDateOfEngagement: editingEntry.proposedDateOfEngagement ?? '',
          modeOfEngagement: editingEntry.modeOfEngagement ?? '',
          budgetHighlights: editingEntry.budgetHighlights ?? '',
          totalCost: editingEntry.totalCost ?? '',
          uraDelegation: editingEntry.uraDelegation?._id ?? '',
        })
      } else {
        setForm({ ...emptyForm, name: '' })
      }
      setStep(1)
    }
  }, [open, editingEntry])

  // Auto-compute priority from Power and Interest
  React.useEffect(() => {
    const computed = computePriority(form.power, form.interest)
    setForm(prev =>
      prev.priority !== computed ? { ...prev, priority: computed } : prev,
    )
  }, [form.power, form.interest])

  const update = (key: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const canProceedFromStep = (s: number): boolean => {
    if (s === 1) return !!form.name.trim()
    return true
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS && canProceedFromStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        sn: isEditing ? undefined : nextSn,
        stakeholder: form.stakeholder || undefined,
        designation: form.designation || undefined,
        phoneNumber: form.phoneNumber || undefined,
        emailAddress: form.emailAddress || undefined,
        address: form.address || undefined,
        initiativeCode: form.initiativeCode || undefined,
        objectiveOfEngagement: form.objectiveOfEngagement || undefined,
        power: form.power || undefined,
        interest: form.interest || undefined,
        priority:
          computePriority(form.power, form.interest) ||
          form.priority ||
          undefined,
        stakeholderExpectations: form.stakeholderExpectations || undefined,
        uraExpectations: form.uraExpectations || undefined,
        proposedDateOfEngagement: form.proposedDateOfEngagement || undefined,
        modeOfEngagement: form.modeOfEngagement || undefined,
        budgetHighlights: form.budgetHighlights || undefined,
        totalCost:
          typeof form.totalCost === 'number'
            ? form.totalCost
            : form.totalCost
              ? Number(form.totalCost)
              : undefined,
        uraDelegation: form.uraDelegation || undefined,
      }
      if (isEditing) {
        payload.stakeholderIndex = editingIndex
        const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'updateStakeholder', payload }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update stakeholder')
        }
      } else {
        const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'addStakeholder', payload }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to add stakeholder')
        }
      }
      onOpenChange(false)
      await router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save stakeholder')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl max-h-[95vh] flex flex-col overflow-hidden'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>
            {isEditing ? 'Edit Stakeholder' : 'Add Stakeholder'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the stakeholder entry details.'
              : 'Add a new stakeholder to the engagement matrix.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className='shrink-0 flex items-center gap-1 py-4'>
          {STEPS.map((s, i) => {
            const StepIcon = s.icon
            const isActive = step === s.id
            const isComplete = step > s.id
            return (
              <React.Fragment key={s.id}>
                <button
                  type='button'
                  onClick={() => (isComplete || isEditing) && setStep(s.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isComplete ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30' : ''}
                    ${!isActive && !isComplete ? 'text-muted-foreground' : ''}
                  `}
                >
                  <StepIcon className='h-4 w-4' />
                  <span className='hidden sm:inline'>{s.title}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                )}
              </React.Fragment>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 min-h-0'>
          <div className='flex-1 min-h-0 overflow-y-auto px-1 py-1'>
            {/* Step 1: Who */}
            {step === 1 && (
              <div className='space-y-4 animate-in fade-in-50 duration-200'>
                <p className='text-sm text-muted-foreground'>
                  Tell us who this stakeholder is and how to reach them.
                </p>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='stakeholder'>Stakeholder type</Label>
                    <Select
                      value={form.stakeholder}
                      onValueChange={v => update('stakeholder', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                      <SelectContent>
                        {STAKEHOLDER_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='designation'>Designation</Label>
                    <Input
                      id='designation'
                      value={form.designation}
                      onChange={e => update('designation', e.target.value)}
                      placeholder='e.g. Director, Manager'
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='name' required>
                    Full name
                  </Label>
                  <Input
                    id='name'
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder='e.g. John Okello'
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='phoneNumber'>Phone</Label>
                    <PhoneInput
                      id='phoneNumber'
                      value={form.phoneNumber}
                      onChange={(v: string | undefined) =>
                        update('phoneNumber', v ?? '')
                      }
                      disabled={isSubmitting}
                      defaultCountry='UG'
                      placeholder='+256 792 445002'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='emailAddress'>Email</Label>
                    <Input
                      id='emailAddress'
                      type='email'
                      value={form.emailAddress}
                      onChange={e => update('emailAddress', e.target.value)}
                      placeholder='name@example.com'
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='address'>Address</Label>
                  <Textarea
                    id='address'
                    value={form.address}
                    onChange={e => update('address', e.target.value)}
                    placeholder='Physical or postal address'
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Why */}
            {step === 2 && (
              <div className='space-y-4 animate-in fade-in-50 duration-200'>
                <p className='text-sm text-muted-foreground'>
                  What is the purpose of engaging with this stakeholder, and how
                  important are they?
                </p>
                {initiatives.length > 0 && (
                  <div className='space-y-2'>
                    <Label>Linked initiative (optional)</Label>
                    <Select
                      value={form.initiativeCode || '__none__'}
                      onValueChange={v =>
                        update('initiativeCode', v === '__none__' ? '' : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='None — out of scope' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__none__'>
                          None — out of scope
                        </SelectItem>
                        {initiatives.map(i => (
                          <SelectItem key={i.code} value={i.code}>
                            {i.code} — {i.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>
                      Some engagements may be outside the current contract
                      scope.
                    </p>
                  </div>
                )}
                <div className='space-y-2'>
                  <Label htmlFor='objectiveOfEngagement'>
                    Objective of the engagement
                  </Label>
                  <Textarea
                    id='objectiveOfEngagement'
                    value={form.objectiveOfEngagement}
                    onChange={e =>
                      update('objectiveOfEngagement', e.target.value)
                    }
                    placeholder='e.g. Secure approval for the new tax policy...'
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Priority mapping</Label>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Power = influence over outcomes. Interest = concern about
                    the project. Priority is calculated automatically.
                  </p>
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='space-y-2'>
                      <Label className='text-xs'>Power</Label>
                      <Select
                        value={form.power}
                        onValueChange={v => update('power', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='H/M/L' />
                        </SelectTrigger>
                        <SelectContent>
                          {POWER_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label className='text-xs'>Interest</Label>
                      <Select
                        value={form.interest}
                        onValueChange={v => update('interest', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='H/M/L' />
                        </SelectTrigger>
                        <SelectContent>
                          {POWER_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label className='text-xs'>Priority (calculated)</Label>
                      <div className='flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm'>
                        {form.priority ? (
                          (POWER_OPTIONS.find(o => o.value === form.priority)
                            ?.label ?? form.priority)
                        ) : (
                          <span className='text-muted-foreground text-xs'>
                            Select Power & Interest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Expectations */}
            {step === 3 && (
              <div className='space-y-4 animate-in fade-in-50 duration-200'>
                <p className='text-sm text-muted-foreground'>
                  What does each party expect, and when will you engage?
                </p>
                <div className='space-y-2'>
                  <Label htmlFor='stakeholderExpectations'>
                    What the stakeholder expects
                  </Label>
                  <Textarea
                    id='stakeholderExpectations'
                    value={form.stakeholderExpectations}
                    onChange={e =>
                      update('stakeholderExpectations', e.target.value)
                    }
                    placeholder='e.g. Timely updates, consultation on changes...'
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='uraExpectations'>What you expect</Label>
                  <Textarea
                    id='uraExpectations'
                    value={form.uraExpectations}
                    onChange={e => update('uraExpectations', e.target.value)}
                    placeholder='e.g. Support for the initiative, feedback...'
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='proposedDateOfEngagement'>
                      Proposed date of engagement
                    </Label>
                    <Input
                      id='proposedDateOfEngagement'
                      type='date'
                      value={form.proposedDateOfEngagement}
                      onChange={e =>
                        update('proposedDateOfEngagement', e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Mode of engagement</Label>
                    <Select
                      value={form.modeOfEngagement}
                      onValueChange={v => update('modeOfEngagement', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='e.g. Meeting, Email' />
                      </SelectTrigger>
                      <SelectContent>
                        {MODE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Resources */}
            {step === 4 && (
              <div className='space-y-4 animate-in fade-in-50 duration-200'>
                <p className='text-sm text-muted-foreground'>
                  Budget and who will lead the engagement.
                </p>
                <div className='space-y-2'>
                  <Label htmlFor='budgetHighlights'>Budget highlights</Label>
                  <Textarea
                    id='budgetHighlights'
                    value={form.budgetHighlights}
                    onChange={e => update('budgetHighlights', e.target.value)}
                    placeholder='e.g. Venue hire, materials, travel...'
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='totalCost'>Total cost (UGX)</Label>
                    <Input
                      id='totalCost'
                      type='number'
                      min={0}
                      step={0.01}
                      value={form.totalCost === '' ? '' : form.totalCost}
                      onChange={e => {
                        const v = e.target.value
                        update('totalCost', v ? Number(v) : '')
                      }}
                      placeholder='0'
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Engagement Lead (from the section)</Label>
                    <Select
                      value={form.uraDelegation}
                      onValueChange={v => update('uraDelegation', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select from section' />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(s => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.fullName}
                            {s.staffId ? ` (${s.staffId})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className='mt-4 shrink-0'>
            <div className='flex w-full items-center justify-between'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <div className='flex items-center gap-2'>
                {step > 1 ? (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className='h-4 w-4 mr-1' />
                    Back
                  </Button>
                ) : null}
                {step < TOTAL_STEPS ? (
                  <Button
                    type='button'
                    onClick={handleNext}
                    disabled={isSubmitting || !canProceedFromStep(step)}
                  >
                    Next
                    <ChevronRight className='h-4 w-4 ml-1' />
                  </Button>
                ) : (
                  <Button
                    type='submit'
                    disabled={isSubmitting || !form.name.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Saving...
                      </>
                    ) : isEditing ? (
                      'Update Stakeholder'
                    ) : (
                      'Add Stakeholder'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
