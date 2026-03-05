import { defineField, defineType } from 'sanity'

export const member = defineType({
  name: 'member',
  title: 'Member',
  type: 'document',
  fields: [
    {
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
      description: 'Member’s full name',
      validation: Rule => Rule.required().max(100),
    },
    {
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
      description: 'E.g. +32 1234 5678',
      validation: Rule =>
        Rule.required()
          .min(8)
          .max(20)
          .regex(/^\+?[0-9 ]+$/, {
            name: 'valid phone number',
            invert: false,
          }),
    },
    {
      name: 'email',
      title: 'Email Address',
      type: 'string',
      description: 'Must be a valid email',
      validation: Rule =>
        Rule.required().email().error('Please enter a valid email address'),
    },
    {
      name: 'memberId',
      title: 'Member ID',
      type: 'string',
      description: 'Unique identifier (e.g., “M-1001”)',
      validation: Rule => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Active or Inactive',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Inactive', value: 'inactive' },
        ],
      },
      initialValue: 'active',
      validation: Rule => Rule.required(),
    },
    {
      name: 'selectedTier',
      title: 'Current Payment Tier',
      type: 'reference',
      to: [{ type: 'paymentTier' }],
      description: 'Which tier the member has chosen for the current year',
    },
    {
      name: 'tierHistory',
      title: 'Tier History',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'tier',
              title: 'Tier',
              type: 'reference',
              to: [{ type: 'paymentTier' }],
              description: 'The tier the member was assigned',
              validation: Rule => Rule.required(),
            },
            {
              name: 'year',
              title: 'Year',
              type: 'number',
              description: 'Calendar year this tier entry applies to',
              validation: Rule => Rule.required().integer().min(2000).max(2100),
            },
            {
              name: 'dateAssigned',
              title: 'Date Assigned',
              type: 'date',
              description: 'Date the member was assigned this tier',
            },
          ],
          preview: {
            select: {
              title: 'tier.title',
              amount: 'tier.amount',
              tier: 'selectedTier.title',
              year: 'year',
            },
            prepare(selection) {
              const { title, amount, tier, year } = selection
              return {
                title: `${title} - UGX ${amount}`,
                subtitle: `Running for the year ${year}`,
              }
            },
          },
        },
      ],
      description:
        'All payment tiers this member has held in previous years (read-only if you want to enforce moving to new tiers per year)',
    },
    {
      name: 'joinedDate',
      title: 'Joined Date',
      type: 'date',
      description: 'When the member first joined',
      validation: Rule => Rule.required(),
    },
  ],
  preview: {
    select: {
      title: 'fullName',
      status: 'status',
    },
    prepare(selection) {
      const { title, status } = selection
      return {
        title,
        subtitle: status.charAt(0).toUpperCase() + status.slice(1),
      }
    },
  },
})
