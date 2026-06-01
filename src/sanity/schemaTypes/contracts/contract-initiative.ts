import { defineField, defineType } from 'sanity'
import { measurableActivity } from './measurable-activity'

/**
 * Initiative under an SSMARTA objective.
 * Same schema as SSMARTA objective: code (1.1.1) and initiative (text).
 * Contains measurable activities (KPI or Cross-cutting).
 */
export const contractInitiative = defineType({
  name: 'contractInitiative',
  title: 'Initiative',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Code',
      type: 'string',
      description: 'Governed format e.g. 1.1.1, 1.1.2',
      validation: Rule =>
        Rule.required().regex(
          /^\d+\.\d+\.\d+$/,
          'Must match format 1.1.1, 1.1.2, 1.1.3',
        ),
    }),
    defineField({
      name: 'title',
      title: 'Initiative',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Position for display order',
    }),
    defineField({
      name: 'measurableActivities',
      title: 'Measurable Activities',
      type: 'array',
      of: [{ type: 'measurableActivity' }],
      description: 'Measurable activities can be KPI or Cross-cutting',
    }),
  ],
  preview: {
    select: { code: 'code', title: 'title' },
    prepare({ code, title }) {
      return {
        title: code ? `${code} – ${title || 'Initiative'}` : title || 'Initiative',
      }
    },
  },
})
