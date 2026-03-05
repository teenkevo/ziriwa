import { defineField, defineType } from 'sanity'

export const propertyTransaction = defineType({
  name: 'propertyTransaction',
  title: 'Property Transaction',
  type: 'document',
  description: 'Purchase, sale, maintenance and fees for property assets',
  fields: [
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      to: [{ type: 'property' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'transactionType',
      title: 'Transaction Type',
      type: 'string',
      options: {
        list: [
          { title: 'Purchase', value: 'purchase' },
          { title: 'Sale', value: 'sale' },
          { title: 'Maintenance', value: 'maintenance' },
          { title: 'Fees', value: 'fees' },
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
      name: 'counterparty',
      title: 'Counterparty',
      type: 'string',
      description: 'Buyer, seller, or vendor name',
    }),
    defineField({
      name: 'ownershipDocuments',
      title: 'Ownership / Supporting Documents',
      type: 'array',
      description: 'Title deeds, sale agreements, transfer documents, invoices',
      of: [{ type: 'file' }],
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { transactionType?: string }
          const requiresDocs = ['purchase', 'sale'].includes(
            parent?.transactionType ?? '',
          )
          if (requiresDocs && (!value || (value as unknown[]).length === 0)) {
            return 'Supporting documents are required for purchase and sale transactions'
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
      propertyName: 'property.name',
    },
    prepare(selection) {
      const { amount, transactionType, date, propertyName } = selection
      const typeLabel =
        transactionType === 'purchase'
          ? 'Purchase'
          : transactionType === 'sale'
            ? 'Sale'
            : transactionType === 'maintenance'
              ? 'Maintenance'
              : 'Fees'
      return {
        title: `${typeLabel} - UGX ${amount?.toLocaleString() ?? 0}`,
        subtitle: [propertyName, date].filter(Boolean).join(' • '),
      }
    },
  },
})
