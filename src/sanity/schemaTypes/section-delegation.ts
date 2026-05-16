import { defineField, defineType } from 'sanity'

export const sectionDelegation = defineType({
  name: 'sectionDelegation',
  title: 'Section Delegation',
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
      name: 'fromStaff',
      title: 'Absent staff',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Staff member on leave whose duties are covered',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'toStaff',
      title: 'Acting staff',
      type: 'reference',
      to: [{ type: 'staff' }],
      description:
        'Staff covering duties while keeping their own role (dual role)',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'actingRole',
      title: 'Acting role',
      type: 'string',
      options: {
        list: [
          { title: 'Manager', value: 'manager' },
          { title: 'Supervisor', value: 'supervisor' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Scheduled', value: 'scheduled' },
          { title: 'Active', value: 'active' },
          { title: 'Completed', value: 'completed' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      initialValue: 'scheduled',
    }),
    defineField({
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'createdBy',
      title: 'Created by',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
  ],
  preview: {
    select: {
      fromName: 'fromStaff.fullName',
      toName: 'toStaff.fullName',
      actingRole: 'actingRole',
      startDate: 'startDate',
      endDate: 'endDate',
    },
    prepare({ fromName, toName, actingRole, startDate, endDate }) {
      return {
        title: `${toName ?? '—'} acting as ${actingRole} for ${fromName ?? '—'}`,
        subtitle: [startDate, endDate].filter(Boolean).join(' → '),
      }
    },
  },
})
