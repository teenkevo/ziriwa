import { defineField, defineType } from 'sanity'

export const investment = defineType({
  name: 'investment',
  title: 'Investment',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'For non–unit trust: display name. For unit trust, use Account Name instead.',
      hidden: ({ parent }) => parent?.investmentType === 'unit_trust',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType !== 'unit_trust' && !value) {
            return 'Name is required'
          }
          return true
        }).max(200),
    }),
    defineField({
      name: 'investmentType',
      title: 'Investment Type',
      type: 'string',
      options: {
        list: [
          { title: 'Unit Trust', value: 'unit_trust' },
          { title: 'Bond', value: 'bond' },
          { title: 'Money Market', value: 'money_market' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      description: 'e.g. Stanbic Unit Trust, NSSF',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType === 'unit_trust' && !value) {
            return 'Provider is required for unit trust investments'
          }
          return true
        }),
    }),
    defineField({
      name: 'accountName',
      title: 'Account Name',
      type: 'string',
      hidden: ({ parent }) => parent?.investmentType !== 'unit_trust',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType === 'unit_trust' && !value) {
            return 'Account name is required for unit trust investments'
          }
          return true
        }),
    }),
    defineField({
      name: 'product',
      title: 'Product',
      type: 'string',
      options: {
        list: [
          { title: 'Umbrella Trust Fund', value: 'umbrella_trust_fund' },
          { title: 'Dollar Fund', value: 'dollar_fund' },
          { title: 'Money Market Fund', value: 'money_market_fund' },
          { title: 'Balanced Fund', value: 'balanced_fund' },
        ],
        layout: 'radio',
      },
      hidden: ({ parent }) => parent?.investmentType !== 'unit_trust',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType === 'unit_trust' && !value) {
            return 'Product is required for unit trust investments'
          }
          return true
        }),
    }),
    defineField({
      name: 'memberNumber',
      title: 'Member Number',
      type: 'string',
      hidden: ({ parent }) => parent?.investmentType !== 'unit_trust',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType === 'unit_trust' && !value) {
            return 'Member number is required for unit trust investments'
          }
          return true
        }),
    }),
    defineField({
      name: 'accountNumber',
      title: 'Account Number',
      type: 'string',
      hidden: ({ parent }) => parent?.investmentType !== 'unit_trust',
      validation: Rule =>
        Rule.custom((value, context) => {
          const parent = context.parent as { investmentType?: string }
          if (parent?.investmentType === 'unit_trust' && !value) {
            return 'Account number is required for unit trust investments'
          }
          return true
        }),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Liquidated', value: 'liquidated' },
          { title: 'Suspended', value: 'suspended' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      name: 'name',
      investmentType: 'investmentType',
      provider: 'provider',
      accountName: 'accountName',
    },
    prepare(selection) {
      const { name, investmentType, provider, accountName } = selection
      const typeLabelMap: Record<string, string> = {
        unit_trust: 'Unit Trust',
        bond: 'Bond',
        money_market: 'Money Market',
        other: 'Other',
      }
      const typeLabel = typeLabelMap[investmentType] ?? investmentType
      const displayName =
        investmentType === 'unit_trust' ? accountName : name
      return {
        title: displayName || name || accountName || 'Untitled Investment',
        subtitle: [typeLabel, provider].filter(Boolean).join(' • '),
      }
    },
  },
})
