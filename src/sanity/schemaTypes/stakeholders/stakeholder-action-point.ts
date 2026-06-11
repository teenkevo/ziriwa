import { defineField, defineType } from 'sanity'

/**
 * Follow-up action point from a stakeholder engagement.
 */
export const stakeholderActionPoint = defineType({
  name: 'stakeholderActionPoint',
  title: 'Stakeholder Action Point',
  type: 'object',
  fields: [
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'assignee',
      title: 'Assignee',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'dueDate',
      title: 'Due Date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      description: 'description',
      dueDate: 'dueDate',
      assigneeName: 'assignee.fullName',
    },
    prepare({ description, dueDate, assigneeName }) {
      return {
        title: description || 'Action point',
        subtitle: [assigneeName, dueDate].filter(Boolean).join(' · '),
      }
    },
  },
})
