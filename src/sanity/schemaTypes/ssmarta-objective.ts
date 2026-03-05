import { defineField, defineType } from 'sanity'
import { contractInitiative } from './contract-initiative'

/**
 * SSMARTA objective under a section contract.
 * Contains initiatives (cross-cutting or KPI-driven).
 * Number governed as 1.1.1, 1.1.2, etc.
 */
export const ssmartaObjective = defineType({
  name: 'ssmartaObjective',
  title: 'SSMARTA Objective',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Code',
      type: 'string',
      description: 'Governed format e.g. 1.1, 1.2, 2.1',
      validation: Rule =>
        Rule.required().regex(/^\d+\.\d+$/, 'Must match format 1.1, 1.2, 2.1'),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Position for numbering (1.1.1, 1.1.2)',
    }),
    defineField({
      name: 'initiatives',
      title: 'Initiatives',
      type: 'array',
      of: [{ type: 'contractInitiative' }],
    }),
  ],
  preview: {
    select: { code: 'code', title: 'title' },
    prepare({ code, title }) {
      return {
        title: code
          ? `${code} – ${title || 'Objective'}`
          : title || 'SSMARTA Objective',
      }
    },
  },
})
