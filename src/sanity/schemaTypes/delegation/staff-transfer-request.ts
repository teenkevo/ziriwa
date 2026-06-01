import { defineField, defineType } from 'sanity'

export const staffTransferRequest = defineType({
  name: 'staffTransferRequest',
  title: 'Staff Transfer Request',
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
      name: 'transferType',
      title: 'Transfer type',
      type: 'string',
      options: {
        list: [
          { title: 'Section', value: 'section' },
          { title: 'Division', value: 'division' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'fromSection',
      title: 'From section',
      type: 'reference',
      to: [{ type: 'section' }],
    }),
    defineField({
      name: 'toSection',
      title: 'To section',
      type: 'reference',
      to: [{ type: 'section' }],
    }),
    defineField({
      name: 'fromDivision',
      title: 'From division',
      type: 'reference',
      to: [{ type: 'division' }],
    }),
    defineField({
      name: 'toDivision',
      title: 'To division',
      type: 'reference',
      to: [{ type: 'division' }],
    }),
    defineField({
      name: 'requestedBy',
      title: 'Requested by',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Approved', value: 'approved' },
          { title: 'Rejected', value: 'rejected' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'reason',
      title: 'Reason',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'approvals',
      title: 'Approvals',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'approverRole',
              title: 'Approver role',
              type: 'string',
            }),
            defineField({
              name: 'approver',
              title: 'Approver',
              type: 'reference',
              to: [{ type: 'staff' }],
            }),
            defineField({
              name: 'decision',
              title: 'Decision',
              type: 'string',
              options: {
                list: [
                  { title: 'Pending', value: 'pending' },
                  { title: 'Approved', value: 'approved' },
                  { title: 'Rejected', value: 'rejected' },
                ],
              },
            }),
            defineField({
              name: 'decidedAt',
              title: 'Decided at',
              type: 'datetime',
            }),
            defineField({
              name: 'comment',
              title: 'Comment',
              type: 'text',
              rows: 2,
            }),
          ],
        },
      ],
    }),
  ],
})
