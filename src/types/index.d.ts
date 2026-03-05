/* eslint-disable no-unused-vars */

declare interface CreateUserProps {
  id: string
  email: string
  fullName: string
  phone: string
  status: UserStatus
}

declare type User = {
  id: string
  memberId: string
  status: UserStatus
  fullName: string
  phone: string
  email: string
  transactions: Transaction[]
  yearsFulfilled: number[]
  arrearStatus: string
}

declare type Transaction = {
  id: string
  userId: string
  groupId: string
  name: string
  amount: number
  method: Method
  category: Category
  dateTime: string
  year: number // The year the transaction was made
}

declare type Category =
  | 'Investment'
  | 'Benevolent'
  | 'Withdrawal'
  | 'Interest'
  | 'Loan'
declare type Method = 'Online-Banking' | 'Agent-Banking' | 'Mobile-Money'
declare type UserStatus = 'Active' | 'Inactive' | 'Suspended'
declare type GroupStatus = 'Archived' | 'Inactive' | 'Archived'
declare type MembershipStatus = 'Active' | 'Expired' | 'Cancelled' | 'Pending'
declare type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Refunded'
