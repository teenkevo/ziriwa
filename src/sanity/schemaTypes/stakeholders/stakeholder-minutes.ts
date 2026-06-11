import { defineField, defineType } from 'sanity'

export const stakeholderMinutes = defineType({
  name: 'stakeholderMinutes',
  title: 'Stakeholder Minutes',
  type: 'object',
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 12,
      description: 'Rich text HTML content for the meeting minutes.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'meetingDate',
      title: 'Meeting Date',
      type: 'date',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'approvals',
      title: 'Approvals',
      type: 'array',
      of: [{ type: 'stakeholderMinutesApproval' }],
    }),
  ],
  preview: {
    select: {
      status: 'status',
      authorName: 'author.fullName',
      meetingDate: 'meetingDate',
    },
    prepare({ status, authorName, meetingDate }) {
      return {
        title: authorName ? `Minutes by ${authorName}` : 'Meeting minutes',
        subtitle: [status, meetingDate].filter(Boolean).join(' · '),
      }
    },
  },
})
