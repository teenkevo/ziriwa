import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

// Define the type for each sale item
type Sale = {
  name: string
  email: string
  amount: number
  avatar: string
  fallback: string
}

// Define the props type for SaleItem
interface SaleItemProps {
  id: string
  name: string
  email: string
  amount: number
}

interface TransactionWithUser {
  id: string
  memberId: string
  fullName: string
  email: string
  amount: number
  description: string
  date: string
}

// Helper function to get initials from full name
function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) // Limit to 2 characters
}

// SaleItem component, with type-safe props
function SaleItem({ id, name, email, amount }: SaleItemProps) {
  return (
    <div className='flex items-center'>
      <Avatar className='h-9 w-9'>
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>

      <div className='ml-4 space-y-1'>
        <Link className='hover:underline' href={`/members/${id}`}>
          <p className='text-sm font-medium leading-none'>{name}</p>
        </Link>

        <p className='text-xs text-muted-foreground'>{email}</p>
      </div>
      <div className='ml-auto font-medium md:text-base text-sm'>
        +UGX {amount.toLocaleString('en-UG')}
      </div>
    </div>
  )
}

// RecentSales component
export function RecentSales({
  recentPayments,
}: {
  recentPayments: TransactionWithUser[]
}) {
  return (
    <div className='space-y-8'>
      {recentPayments.map((payment, index) => (
        <SaleItem
          key={index}
          id={payment.id}
          name={payment.fullName}
          email={payment.email}
          amount={payment.amount}
        />
      ))}
    </div>
  )
}
