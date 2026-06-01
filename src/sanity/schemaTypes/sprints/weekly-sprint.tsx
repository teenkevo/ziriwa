import { defineField, defineType } from 'sanity'

export const weeklySprint = defineType({
  name: 'weeklySprint',
  title: 'Weekly Sprint',
  type: 'document',
  fields: [
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'weekLabel',
      title: 'Week Label',
      type: 'string',
      description: 'e.g. "Week 11 – Mar 10-14, 2026"',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'weekStart',
      title: 'Week Start',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'weekEnd',
      title: 'Week End',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'supervisor',
      title: 'Supervisor',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
      description: 'The supervisor who created this sprint plan',
    }),
    defineField({
      name: 'status',
      title: 'Sprint Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Submitted', value: 'submitted' },
          { title: 'Reviewed', value: 'reviewed' },
        ],
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'tasks',
      title: 'Tasks',
      type: 'array',
      of: [{ type: 'sprintTask' }],
    }),
  ],
  preview: {
    select: {
      week: 'weekLabel',
      supervisor: 'supervisor.fullName',
      status: 'status',
    },
    prepare({ week, supervisor, status }) {
      return {
        title: week || 'Weekly Sprint',
        subtitle: `${supervisor || 'Unknown'} – ${status || 'draft'}`,
      }
    },
  },
})
