import { defineField, defineType } from 'sanity'

export const stakeholderMinutesApproval = defineType({
  name: 'stakeholderMinutesApproval',
  title: 'Minutes Approval',
  type: 'object',
  fields: [
    defineField({
      name: 'assignee',
      title: 'Approver',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Approved', value: 'approved' },
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'decidedAt',
      title: 'Decided At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      assigneeName: 'assignee.fullName',
      status: 'status',
    },
    prepare({ assigneeName, status }) {
      return {
        title: assigneeName || 'Approver',
        subtitle: status === 'approved' ? 'Approved' : 'Pending',
      }
    },
  },
})
