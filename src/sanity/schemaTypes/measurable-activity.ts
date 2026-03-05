import { defineField, defineType } from 'sanity'

/**
 * Measurable activity under an initiative.
 * Type: KPI (with AIM, evidence uploads) or Cross-cutting (bullet style).
 * Number governed as {initiative}-KPI-{n} or {initiative}-CC-{n}.
 * Sub-number: KPI = E1,E2; CC = a,b,c
 */
export const measurableActivity = defineType({
  name: 'measurableActivity',
  title: 'Measurable Activity',
  type: 'object',
  fields: [
    defineField({
      name: 'activityType',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'KPI', value: 'kpi' },
          { title: 'Cross-cutting', value: 'cross-cutting' },
        ],
        layout: 'dropdown',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'aim',
      title: 'AIM',
      type: 'text',
      description: 'AIM text for KPI activities',
      hidden: ({ parent }) => (parent as { activityType?: string })?.activityType !== 'kpi',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Position for numbering (a,b,c or E1,E2)',
    }),
    defineField({
      name: 'targetDate',
      title: 'Target Date',
      type: 'date',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Not started', value: 'not_started' },
          { title: 'In progress', value: 'in_progress' },
          { title: 'Completed', value: 'completed' },
        ],
      },
      initialValue: 'not_started',
    }),
    defineField({
      name: 'evidence',
      title: 'Evidence / Uploads',
      type: 'array',
      of: [{ type: 'file' }, { type: 'image' }],
      description: 'Uploads for KPI activities',
      hidden: ({ parent }) => (parent as { activityType?: string })?.activityType !== 'kpi',
    }),
  ],
  preview: {
    select: { title: 'title', activityType: 'activityType' },
    prepare({ title, activityType }) {
      const type = activityType === 'kpi' ? 'KPI' : 'CC'
      return { title: title || 'Activity', subtitle: type }
    },
  },
})
