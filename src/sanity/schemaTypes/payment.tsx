import { format } from 'date-fns'
import { defineType } from 'sanity'
import { CheckmarkIcon, CloseCircleIcon } from '@sanity/icons'

export const payment = defineType({
  name: 'payment',
  title: 'Payment',
  type: 'document',
  fields: [
    {
      name: 'type',
      title: 'Payment Type',
      type: 'string',
      description: 'Investment, Benovelent, or Other',
      options: {
        list: ['investment', 'benovelent', 'other'],
      },
    },
    {
      name: 'member',
      title: 'Member',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'Which member made this payment',
      validation: Rule => Rule.required(),
    },
    {
      name: 'tier',
      title: 'Payment Tier',
      type: 'reference',
      to: [{ type: 'paymentTier' }],
      description: 'Which payment tier this payment applies to',
      validation: Rule => Rule.required(),
    },
    {
      name: 'year',
      title: 'Year paid for',
      type: 'number',
      description: 'The year of the payment',
      validation: Rule => Rule.required().integer().min(2000).max(2100),
    },
    {
      name: 'month',
      title: 'Month paid for',
      type: 'number',
      description: 'The month of the payment',
      options: {
        list: [
          { title: 'January', value: 1 },
          { title: 'February', value: 2 },
          { title: 'March', value: 3 },
          { title: 'April', value: 4 },
          { title: 'May', value: 5 },
          { title: 'June', value: 6 },
          { title: 'July', value: 7 },
          { title: 'August', value: 8 },
          { title: 'September', value: 9 },
          { title: 'October', value: 10 },
          { title: 'November', value: 11 },
          { title: 'December', value: 12 },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'Optional description of the payment',
    },
    {
      name: 'amountPaid',
      title: 'Amount Paid',
      type: 'number',
      description: 'Amount actually paid',
      validation: Rule => Rule.required().precision(2).min(0),
    },
    {
      name: 'paymentDate',
      title: 'Payment Date',
      type: 'datetime',
      description: 'When the payment was made',
      validation: Rule => Rule.required(),
    },
    {
      name: 'status',
      title: 'Payment Status',
      type: 'string',
      description: 'Pending, Completed, or Failed',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Completed', value: 'completed' },
          { title: 'Failed', value: 'failed' },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'text',
      description: 'Optional notes about this payment',
    },
  ],
  preview: {
    select: {
      title: 'member.fullName',
      subtitle: 'description',
      status: 'status',
    },
    prepare(selection) {
      const { title, subtitle, status } = selection
      return {
        title,
        subtitle: `${subtitle} - ${status}`,
        media: status === 'completed' ? CheckmarkIcon : CloseCircleIcon,
      }
    },
  },
})
