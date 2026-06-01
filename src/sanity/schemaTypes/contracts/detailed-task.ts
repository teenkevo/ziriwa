import { defineField, defineType } from 'sanity'

const PRIORITY_OPTIONS = [
  { title: 'Highest', value: 'highest' },
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
  { title: 'Lowest', value: 'lowest' },
]

const TASK_STATUS_OPTIONS = [
  { title: 'To do', value: 'to_do' },
  { title: 'Inputs submitted', value: 'inputs_submitted' },
  { title: 'In progress', value: 'in_progress' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'In review', value: 'in_review' },
  { title: 'Done', value: 'done' },
]

export const detailedTask = defineType({
  name: 'detailedTask',
  title: 'Detailed Task',
  type: 'object',
  fields: [
    defineField({
      name: 'task',
      title: 'Task',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: {
        list: PRIORITY_OPTIONS,
        layout: 'dropdown',
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'assignee',
      title: 'Assignee',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'inputs',
      title: 'Inputs',
      type: 'object',
      fields: [
        {
          name: 'file',
          title: 'File',
          type: 'file',
        },
        {
          name: 'submittedAt',
          title: 'Submitted At',
          type: 'datetime',
        },
      ],
      description: 'Single file submitted by officer as inputs/dependencies. Available when task is assigned.',
    }),
    defineField({
      name: 'inputsReviewThread',
      title: 'Inputs Review Thread',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'inputsReviewEntry',
          fields: [
            { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'staff' }] },
            {
              name: 'role',
              title: 'Role',
              type: 'string',
              options: {
                list: [
                  { title: 'Officer', value: 'officer' },
                  { title: 'Supervisor', value: 'supervisor' },
                ],
                layout: 'dropdown',
              },
            },
            {
              name: 'action',
              title: 'Action',
              type: 'string',
              options: {
                list: [
                  { title: 'Submit', value: 'submit' },
                  { title: 'Reject', value: 'reject' },
                  { title: 'Approve', value: 'approve' },
                  { title: 'Respond', value: 'respond' },
                ],
                layout: 'dropdown',
              },
            },
            { name: 'message', title: 'Message', type: 'text' },
            { name: 'createdAt', title: 'Created At', type: 'datetime' },
            {
              name: 'file',
              title: 'File',
              type: 'file',
              description: 'Attached file for submit/respond entries. Kept for audit trail.',
            },
          ],
        },
      ],
      description: 'Trackable back-and-forth between officer and supervisor on inputs.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: TASK_STATUS_OPTIONS,
        layout: 'dropdown',
      },
      initialValue: 'to_do',
    }),
    defineField({
      name: 'targetDate',
      title: 'Target Date',
      type: 'date',
      description:
        'For one-off tasks: when due. For periodic tasks: optional, used as reporting start if reportingPeriodStart not set.',
    }),
    defineField({
      name: 'reportingFrequency',
      title: 'Reporting Frequency',
      type: 'string',
      options: {
        list: [
          { title: 'Weekly', value: 'weekly' },
          { title: 'Monthly', value: 'monthly' },
          { title: 'Quarterly', value: 'quarterly' },
          { title: 'N/A', value: 'n/a' },
        ],
        layout: 'dropdown',
      },
      initialValue: 'n/a',
      description:
        'When set, this task becomes an expected deliverable to report on each period. Used for automated reporting.',
    }),
    defineField({
      name: 'expectedDeliverable',
      title: 'Expected Deliverable',
      type: 'string',
      description:
        'What to deliver each period (e.g. "Monthly budget report", "Weekly status update"). Editable per task.',
      hidden: ({ parent }) => parent?.reportingFrequency === 'n/a',
    }),
    defineField({
      name: 'reportingPeriodStart',
      title: 'Reporting Period Start',
      type: 'date',
      description:
        'When periodic reporting begins. Defaults to FY start. Used to derive expected periods for automated reporting.',
      hidden: ({ parent }) => parent?.reportingFrequency === 'n/a',
    }),
    defineField({
      name: 'periodDeliverables',
      title: 'Period Deliverables',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'periodDeliverable',
          fields: [
            {
              name: 'periodKey',
              title: 'Period Key',
              type: 'string',
              description:
                'e.g. 2025-01 (monthly), 2025-W01 (weekly), 2025-Q1 (quarterly)',
            },
            {
              name: 'status',
              title: 'Status',
              type: 'string',
              options: {
                list: [
                  { title: 'Pending', value: 'pending' },
                  { title: 'Delivered', value: 'delivered' },
                  { title: 'In review', value: 'in_review' },
                  { title: 'Done', value: 'done' },
                ],
                layout: 'dropdown',
              },
              initialValue: 'pending',
              description:
                'Pending: not yet submitted. Delivered: submitted, awaiting review. In review: with supervisor. Done: approved.',
            },
            {
              name: 'submittedAt',
              title: 'Submitted At',
              type: 'datetime',
            },
            {
              name: 'deliverable',
              title: 'Deliverable',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'periodDeliverableItem',
                  fields: [
                    { name: 'file', title: 'File', type: 'file' },
                    {
                      name: 'tag',
                      title: 'Tag',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Support', value: 'support' },
                          { title: 'Main', value: 'main' },
                        ],
                        layout: 'dropdown',
                      },
                      initialValue: 'support',
                    },
                    {
                      name: 'locked',
                      title: 'Locked',
                      type: 'boolean',
                      initialValue: false,
                      description:
                        'When true, main deliverable has been sent for review.',
                    },
                  ],
                  preview: {
                    select: { tag: 'tag' },
                    prepare({ tag }) {
                      return {
                        title:
                          tag === 'main'
                            ? 'Main deliverable'
                            : 'Supporting deliverable',
                      }
                    },
                  },
                },
              ],
              description: 'Supporting and main deliverables for this period.',
            },
            {
              name: 'deliverableReviewThread',
              title: 'Deliverable Review Thread',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'periodDeliverableReviewEntry',
                  fields: [
                    {
                      name: 'author',
                      title: 'Author',
                      type: 'reference',
                      to: [{ type: 'staff' }],
                    },
                    {
                      name: 'role',
                      title: 'Role',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Officer', value: 'officer' },
                          { title: 'Supervisor', value: 'supervisor' },
                        ],
                        layout: 'dropdown',
                      },
                    },
                    {
                      name: 'action',
                      title: 'Action',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Submit', value: 'submit' },
                          { title: 'Reject', value: 'reject' },
                          { title: 'Approve', value: 'approve' },
                          { title: 'Respond', value: 'respond' },
                        ],
                        layout: 'dropdown',
                      },
                    },
                    { name: 'message', title: 'Message', type: 'text' },
                    { name: 'createdAt', title: 'Created At', type: 'datetime' },
                    {
                      name: 'file',
                      title: 'File',
                      type: 'file',
                      description:
                        'Attached file for submit/respond entries.',
                    },
                  ],
                },
              ],
              description:
                'Back-and-forth between officer and supervisor on main deliverable for this period.',
            },
          ],
          preview: {
            select: { periodKey: 'periodKey' },
            prepare({ periodKey }) {
              return { title: periodKey || 'Period' }
            },
          },
        },
      ],
      description:
        'Tracks which periods have been reported. Populated by automated reporting module.',
      hidden: ({ parent }) => parent?.reportingFrequency === 'n/a',
    }),
    defineField({
      name: 'deliverable',
      title: 'Deliverable',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'deliverableItem',
          fields: [
            {
              name: 'file',
              title: 'File',
              type: 'file',
            },
            {
              name: 'tag',
              title: 'Tag',
              type: 'string',
              options: {
                list: [
                  { title: 'Support', value: 'support' },
                  { title: 'Main', value: 'main' },
                ],
                layout: 'dropdown',
              },
              initialValue: 'support',
            },
            {
              name: 'locked',
              title: 'Locked',
              type: 'boolean',
              initialValue: false,
              description:
                'When true, deliverable has been sent for supervisor review and cannot be deleted.',
            },
          ],
          preview: {
            select: { tag: 'tag' },
            prepare({ tag }) {
              return {
                title:
                  tag === 'main' ? 'Main deliverable' : 'Supporting deliverable',
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'deliverableReviewThread',
      title: 'Deliverable Review Thread',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'deliverableReviewEntry',
          fields: [
            {
              name: 'author',
              title: 'Author',
              type: 'reference',
              to: [{ type: 'staff' }],
            },
            {
              name: 'role',
              title: 'Role',
              type: 'string',
              options: {
                list: [
                  { title: 'Officer', value: 'officer' },
                  { title: 'Supervisor', value: 'supervisor' },
                ],
                layout: 'dropdown',
              },
            },
            {
              name: 'action',
              title: 'Action',
              type: 'string',
              options: {
                list: [
                  { title: 'Submit', value: 'submit' },
                  { title: 'Reject', value: 'reject' },
                  { title: 'Approve', value: 'approve' },
                  { title: 'Respond', value: 'respond' },
                ],
                layout: 'dropdown',
              },
            },
            { name: 'message', title: 'Message', type: 'text' },
            { name: 'createdAt', title: 'Created At', type: 'datetime' },
            {
              name: 'file',
              title: 'File',
              type: 'file',
              description:
                'Attached file for submit/respond entries. Kept for audit trail.',
            },
          ],
        },
      ],
      description:
        'Trackable back-and-forth between officer and supervisor on main deliverable.',
    }),
  ],
  preview: {
    select: { task: 'task' },
    prepare({ task }) {
      return {
        title: task || 'Untitled task',
      }
    },
  },
})
