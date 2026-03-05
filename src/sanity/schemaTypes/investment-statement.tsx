import { defineField, defineType } from 'sanity'

export const investmentStatement = defineType({
  name: 'investmentStatement',
  title: 'Investment Statement',
  type: 'document',
  description: 'Monthly/periodic statements for financial investments (unit trusts, bonds)',
  fields: [
    defineField({
      name: 'investment',
      title: 'Investment',
      type: 'reference',
      to: [{ type: 'investment' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'statementDate',
      title: 'Statement Date',
      type: 'date',
      description: 'Period end date of the statement',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'document',
      title: 'Statement Document',
      type: 'file',
      description: 'Upload the PDF or image of the statement',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'closingBalance',
      title: 'Closing Balance',
      type: 'number',
      description: 'Value at end of period (optional, for tracking growth)',
      validation: Rule => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'interestEarned',
      title: 'Interest / Returns Earned',
      type: 'number',
      description: 'Returns for the period (optional)',
      validation: Rule => Rule.min(0).precision(2),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      statementDate: 'statementDate',
      closingBalance: 'closingBalance',
      investmentName: 'investment.name',
    },
    prepare(selection) {
      const { statementDate, closingBalance, investmentName } = selection
      return {
        title: investmentName
          ? `${investmentName} - ${statementDate}`
          : statementDate ?? 'Statement',
        subtitle: closingBalance
          ? `Balance: UGX ${closingBalance.toLocaleString()}`
          : undefined,
      }
    },
  },
})
