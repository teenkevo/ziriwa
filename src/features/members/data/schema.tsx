import { z } from 'zod'

// Define the Category enum
const Category = z.enum([
  'Investment',
  'Benevolent',
  'Withdrawal',
  'Interest',
  'Loan',
])

// Define the Method enum
const Method = z.enum(['Online-Banking', 'Agent-Banking', 'Mobile-Money'])

const TransactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  method: Method,
  category: Category,
  dateTime: z.string(),
  year: z.number(),
})

export const userSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  transactions: z.array(TransactionSchema),
  yearsFulfilled: z.array(z.number()),
  arrearStatus: z.string(),
})

export type User = z.infer<typeof userSchema>
