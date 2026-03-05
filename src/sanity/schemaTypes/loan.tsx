import { defineType } from 'sanity'

export const loan = defineType({
  name: 'loan',
  title: 'Loan',
  type: 'document',
  fields: [
    {
      name: 'member',
      title: 'Borrower',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'The member applying for the loan',
      validation: Rule => Rule.required(),
    },
    {
      name: 'amount',
      title: 'Loan Amount',
      type: 'number',
      description: 'The amount being borrowed',
      validation: Rule => Rule.required().min(0).precision(2),
    },
    {
      name: 'guarantor',
      title: 'Guarantor',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'The member guaranteeing this loan',
      validation: Rule => Rule.required(),
    },
    {
      name: 'repaymentPlan',
      title: 'Repayment Plan',
      type: 'string',
      description: 'The repayment plan for this loan',
      options: {
        list: [
          { title: '3 Months', value: '3_months' },
          { title: '6 Months', value: '6_months' },
          { title: '12 Months', value: '12_months' },
          { title: '18 Months', value: '18_months' },
          { title: '24 Months', value: '24_months' },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'interestRate',
      title: 'Interest Rate',
      type: 'number',
      description: 'Interest rate as a percentage (e.g., 2 for 2%)',
      initialValue: 2,
      validation: Rule => Rule.required().min(0).max(100).precision(2),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Current status of the loan',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Approved', value: 'approved' },
          { title: 'Active', value: 'active' },
          { title: 'Completed', value: 'completed' },
          { title: 'Defaulted', value: 'defaulted' },
        ],
      },
      initialValue: 'pending',
      validation: Rule => Rule.required(),
    },
    {
      name: 'applicationDate',
      title: 'Application Date',
      type: 'date',
      description: 'Date the loan was applied for',
      validation: Rule => Rule.required(),
    },
    {
      name: 'startDate',
      title: 'Start Date',
      type: 'date',
      description: 'Date the loan was approved and started',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'Optional description or purpose of the loan',
    },
  ],
  preview: {
    select: {
      memberName: 'member.fullName',
      amount: 'amount',
      status: 'status',
    },
    prepare({ memberName, amount, status }) {
      return {
        title: `${memberName || 'Unknown'} - UGX ${amount?.toLocaleString() || 0}`,
        subtitle: status
          ? status.charAt(0).toUpperCase() + status.slice(1)
          : 'Pending',
      }
    },
  },
})
