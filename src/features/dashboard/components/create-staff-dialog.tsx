'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STAFF_ROLE_OPTIONS, URA_EMAIL_SUFFIX } from '@/lib/staff-roles'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
  idNumber?: string
}

interface CreateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fixedRole?: string
  onSuccess?: (staff: StaffMember) => void
}

export function CreateStaffDialog({
  open,
  onOpenChange,
  fixedRole = 'assistant_commissioner',
  onSuccess,
}: CreateStaffDialogProps) {
  const [isCreating, setIsCreating] = React.useState(false)
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [idNumber, setIdNumber] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState(fixedRole)
  const [phone, setPhone] = React.useState('')
  const [emailError, setEmailError] = React.useState('')

  const isRoleFixed = !!fixedRole

  React.useEffect(() => {
    if (open) {
      setRole(fixedRole)
    }
  }, [open, fixedRole])

  const validateEmail = (value: string) => {
    if (!value) return ''
    const lower = value.trim().toLowerCase()
    if (!lower.endsWith(URA_EMAIL_SUFFIX)) {
      return `Email must end with ${URA_EMAIL_SUFFIX}`
    }
    return ''
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setEmailError(validateEmail(value))
  }

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateEmail(email)
    if (err) {
      setEmailError(err)
      return
    }
    if (!firstName.trim() || !lastName.trim() || !idNumber.trim() || !email.trim()) {
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          idNumber: idNumber.trim(),
          email: email.trim().toLowerCase(),
          role: isRoleFixed ? fixedRole : role,
          phone: phone.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create staff')
      }
      const { id, fullName } = await res.json()
      const newStaff: StaffMember = {
        _id: id,
        fullName,
      }
      setFirstName('')
      setLastName('')
      setIdNumber('')
      setEmail('')
      setPhone('')
      setEmailError('')
      onOpenChange(false)
      onSuccess?.(newStaff)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setIsCreating(false)
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
      <form onSubmit={handleSubmit}>
        <div className='space-y-4 py-2 pb-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='firstName'>First Name</Label>
              <Input
                id='firstName'
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='lastName'>Last Name</Label>
              <Input
                id='lastName'
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='idNumber'>ID Number</Label>
            <Input
              id='idNumber'
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              disabled={isCreating}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              placeholder={`e.g. name${URA_EMAIL_SUFFIX}`}
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={isCreating}
              className={emailError ? 'border-destructive' : ''}
              required
            />
            {emailError && (
              <p className='text-sm text-destructive'>{emailError}</p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='role'>Staff Level</Label>
            <Select
              value={isRoleFixed ? fixedRole : role}
              onValueChange={v => !isRoleFixed && setRole(v)}
              disabled={isCreating || isRoleFixed}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select level' />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone (optional)</Label>
            <Input
              id='phone'
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={isCreating}
            />
          </div>
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
              isCreating ||
              !firstName.trim() ||
              !lastName.trim() ||
              !idNumber.trim() ||
              !email.trim() ||
              !!emailError
            }
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
    </DialogContent>
  )
}
