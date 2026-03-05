'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle } from 'lucide-react'
import { createUser, updateUserTransactions } from '@/lib/actions'
import { ID } from 'node-appwrite'

export function AddMemberDialog() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [contributionTier, setContributionTier] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // setOpen(false)
    // Reset form fields
    // setFullName('')
    // setEmail('')
    // setPhone('')
    // setContributionTier('')
    // createUser({
    //   id: ID.unique(),
    //   email,
    //   fullName,
    //   phone,
    //   status: 'Active',
    // })

    // const months = [
    //   'January',
    //   // 'February',
    //   // 'March',
    //   // 'April',
    //   // 'May',
    //   // 'June',
    //   // 'July',
    //   // // 'August',
    //   // // 'September',
    //   // // 'October',
    //   // // 'November',
    //   // // 'December',
    // ]
    // const userDocumentId = '674594a8002cc142441c'
    // const tier = 3000
    // const yearPaidFor = 2022

    // updateUserTransactions(
    //   userDocumentId,
    //   months.map(month => {
    //     return {
    //       id: ID.unique(),
    //       userId: userDocumentId,
    //       groupId: '6744e9b800001e926605',
    //       name: `Loan`,
    //       amount: 350000,
    //       method: 'Online-Banking',
    //       category: 'Loan',
    //       dateTime: new Date('2022-02-23').toISOString(),
    //       year: yearPaidFor,
    //     }
    //   }),
    // )
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
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone</Label>
              <Input
                id='phone'
                type='tel'
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='contributionTier'>Contribution Tier</Label>
              <Select
                value={contributionTier}
                onValueChange={setContributionTier}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a tier' />
                </SelectTrigger>
                <SelectContent>
                  {[50000, 100000, 150000, 200000, 250000, 300000, 350000].map(
                    tier => (
                      <SelectItem key={tier} value={tier.toString()}>
                        {tier.toLocaleString()} UGX
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type='submit'>Add Member</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
