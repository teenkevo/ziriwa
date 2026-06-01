import { defineField, defineType } from 'sanity'

export const orgRoleDelegation = defineType({
  name: 'orgRoleDelegation',
  title: 'Organisation role delegation',
  type: 'document',
  fields: [
    defineField({
      name: 'scope',
      title: 'Scope',
      type: 'string',
      options: {
        list: [
          { title: 'Division', value: 'division' },
          { title: 'Department', value: 'department' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'division',
      title: 'Division',
      type: 'reference',
      to: [{ type: 'division' }],
      hidden: ({ document }) => document?.scope !== 'division',
    }),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{ type: 'department' }],
      hidden: ({ document }) => document?.scope !== 'department',
    }),
    defineField({
      name: 'fromStaff',
      title: 'Absent staff',
      type: 'reference',
      to: [{ type: 'staff' }],
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
          { title: 'Assistant commissioner', value: 'assistant_commissioner' },
          { title: 'Commissioner', value: 'commissioner' },
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
      scope: 'scope',
      startDate: 'startDate',
      endDate: 'endDate',
    },
    prepare({ fromName, toName, actingRole, scope, startDate, endDate }) {
      return {
        title: `${toName ?? '—'} acting as ${actingRole} for ${fromName ?? '—'}`,
        subtitle: [scope, startDate, endDate].filter(Boolean).join(' · '),
      }
    },
  },
})
