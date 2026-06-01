import { defineField, defineType } from 'sanity'

export const boardAction = defineType({
  name: 'boardAction',
  title: 'Board Action',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required().max(180),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'dueDate',
      title: 'Due Date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'At Commissioner', value: 'at_commissioner' },
          { title: 'Assigned to Division', value: 'assigned_to_division' },
          { title: 'Delegated to Section', value: 'delegated_to_section' },
          { title: 'Completed', value: 'completed' },
        ],
      },
      initialValue: 'at_commissioner',
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{ type: 'department' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'division',
      title: 'Assigned Division',
      type: 'reference',
      to: [{ type: 'division' }],
      description: 'Optional. Leave empty for commissioner-level actions.',
    }),
    defineField({
      name: 'section',
      title: 'Assigned Section',
      type: 'reference',
      to: [{ type: 'section' }],
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'delegatedBy',
      title: 'Delegated By (AC)',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      dueDate: 'dueDate',
      division: 'division.fullName',
      status: 'status',
    },
    prepare({ title, dueDate, division, status }) {
      return {
        title: title || 'Board Action',
        subtitle: [division, dueDate, status].filter(Boolean).join(' • '),
      }
    },
  },
})
