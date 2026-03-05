import { defineType } from 'sanity'

export const paymentTier = defineType({
  name: 'paymentTier',
  title: 'Payment Tier',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Tier Title',
      type: 'string',
      description: 'Human‐readable name, e.g. "Gold 2025"',
      validation: Rule => Rule.required().max(50),
    },
    {
      name: 'amount',
      title: 'Amount',
      type: 'number',
      description: 'Amount required for this tier',
      validation: Rule => Rule.required().precision(2).min(0),
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'amount',
    },
  },
})
