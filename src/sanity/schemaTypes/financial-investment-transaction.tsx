import { defineField, defineType } from 'sanity'

export const financialInvestmentTransaction = defineType({
  name: 'financialInvestmentTransaction',
  title: 'Financial Investment Transaction',
  type: 'document',
  description: 'Deposits and withdrawals for unit trusts, bonds, money market funds',
  fields: [
    defineField({
      name: 'investment',
      title: 'Investment',
      type: 'reference',
      to: [{ type: 'investment' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'transactionType',
      title: 'Transaction Type',
      type: 'string',
      options: {
        list: [
          { title: 'Deposit', value: 'deposit' },
          { title: 'Withdrawal', value: 'withdrawal' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'amount',
      title: 'Amount',
      type: 'number',
      validation: Rule => Rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'referenceNumber',
      title: 'Reference Number',
      type: 'string',
      description: 'Bank or provider transaction reference',
    }),
    defineField({
      name: 'proofOfDeposit',
      title: 'Proof of Deposit',
      type: 'file',
      description: 'Required for deposits - upload bank slip or confirmation',
      hidden: ({ parent }) => parent?.transactionType !== 'deposit',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { transactionType?: string }
          if (parent?.transactionType === 'deposit' && !value) {
            return 'Proof of deposit is required for deposits'
          }
          return true
        }),
    }),
    defineField({
      name: 'redemptionForm',
      title: 'Redemption Form',
      type: 'file',
      description: 'Required for withdrawals - upload signed redemption form',
      hidden: ({ parent }) => parent?.transactionType !== 'withdrawal',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { transactionType?: string }
          if (parent?.transactionType === 'withdrawal' && !value) {
            return 'Redemption form is required for withdrawals'
          }
          return true
        }),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Confirmed', value: 'confirmed' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
        layout: 'radio',
      },
      initialValue: 'confirmed',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      amount: 'amount',
      transactionType: 'transactionType',
      date: 'date',
      investmentName: 'investment.name',
    },
    prepare(selection) {
      const { amount, transactionType, date, investmentName } = selection
      const typeLabel =
        transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'
      return {
        title: `${typeLabel} - UGX ${amount?.toLocaleString() ?? 0}`,
        subtitle: [investmentName, date].filter(Boolean).join(' • '),
      }
    },
  },
})
