import { defineField, defineType } from 'sanity'

export const workSubmission = defineType({
  name: 'workSubmission',
  title: 'Work Submission',
  type: 'object',
  fields: [
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'startTime',
      title: 'Start Time',
      type: 'string',
      description: 'HH:mm format',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'endTime',
      title: 'End Time',
      type: 'string',
      description: 'HH:mm format',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'totalHours',
      title: 'Total Hours',
      type: 'number',
      description: 'Auto-calculated from start and end time',
    }),
    defineField({
      name: 'description',
      title: 'Description of Work Done',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'output',
      title: 'Output (Evidence)',
      type: 'file',
      description: 'PDF file of the realized output',
    }),
    defineField({
      name: 'revenueAssessed',
      title: 'Revenue Assessed',
      type: 'number',
      description: 'Required for compliance activities',
    }),
    defineField({
      name: 'status',
      title: 'Review Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Approved', value: 'approved' },
          { title: 'Rejected', value: 'rejected' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
    }),
    defineField({
      name: 'reviewThread',
      title: 'Review Thread',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'role',
              title: 'Role',
              type: 'string',
              options: { list: ['officer', 'supervisor'] },
            }),
            defineField({
              name: 'action',
              title: 'Action',
              type: 'string',
              options: { list: ['submit', 'reject', 'approve', 'respond'] },
            }),
            defineField({ name: 'message', title: 'Message', type: 'text' }),
            defineField({
              name: 'createdAt',
              title: 'Created At',
              type: 'datetime',
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      date: 'date',
      startTime: 'startTime',
      endTime: 'endTime',
      status: 'status',
    },
    prepare({ date, startTime, endTime, status }) {
      const statusLabels: Record<string, string> = {
        pending: '⏳ Pending',
        approved: '✅ Approved',
        rejected: '❌ Rejected',
      }
      return {
        title: `${date || '?'} ${startTime || '?'}-${endTime || '?'}`,
        subtitle: statusLabels[status] || status,
      }
    },
  },
})
