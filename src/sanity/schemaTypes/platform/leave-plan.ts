import { defineField, defineType } from 'sanity'

export const leavePlan = defineType({
  name: 'leavePlan',
  title: 'Leave plan',
  type: 'document',
  fields: [
    defineField({
      name: 'staff',
      title: 'Staff',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'reliefStaff',
      title: 'Relief person',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Colleague covering this leave',
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
      validation: Rule =>
        Rule.required().custom((endDate, context) => {
          const startDate = (context.parent as { startDate?: string } | undefined)
            ?.startDate
          if (startDate && typeof endDate === 'string' && endDate < startDate) {
            return 'End date must be on or after the start date'
          }
          return true
        }),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Planned', value: 'planned' },
          { title: 'Confirmed', value: 'confirmed' },
        ],
        layout: 'radio',
      },
      initialValue: 'planned',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          { title: 'Annual', value: 'annual' },
          { title: 'Sick', value: 'sick' },
          { title: 'Study', value: 'study' },
          { title: 'Compassionate', value: 'compassionate' },
          { title: 'Unpaid', value: 'unpaid' },
          { title: 'Other', value: 'other' },
        ],
      },
      initialValue: 'annual',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {
      staffName: 'staff.fullName',
      startDate: 'startDate',
      endDate: 'endDate',
      status: 'status',
    },
    prepare({ staffName, startDate, endDate, status }) {
      return {
        title: staffName || 'Leave plan',
        subtitle: [startDate, endDate, status].filter(Boolean).join(' · '),
      }
    },
  },
})
