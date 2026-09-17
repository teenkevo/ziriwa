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

const REVIEW_ROLE_OPTIONS = [
  { title: 'Officer', value: 'officer' },
  { title: 'Supervisor', value: 'supervisor' },
]

const REVIEW_ACTION_OPTIONS = [
  { title: 'Submit', value: 'submit' },
  { title: 'Reject', value: 'reject' },
  { title: 'Approve', value: 'approve' },
  { title: 'Respond', value: 'respond' },
]

function reviewThreadField(
  name: string,
  title: string,
  entryName: string,
  description: string,
  hidden?: boolean,
) {
  return defineField({
    name,
    title,
    type: 'array',
    hidden,
    of: [
      {
        type: 'object',
        name: entryName,
        fields: [
          { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'staff' }] },
          {
            name: 'role',
            title: 'Role',
            type: 'string',
            options: { list: REVIEW_ROLE_OPTIONS, layout: 'dropdown' },
          },
          {
            name: 'action',
            title: 'Action',
            type: 'string',
            options: { list: REVIEW_ACTION_OPTIONS, layout: 'dropdown' },
          },
          { name: 'message', title: 'Message', type: 'text' },
          { name: 'createdAt', title: 'Created At', type: 'datetime' },
          {
            name: 'file',
            title: 'File',
            type: 'file',
            description: 'Attached file for submit/respond entries.',
          },
        ],
      },
    ],
    description,
  })
}

function deliverableArrayField(hidden?: boolean) {
  return defineField({
    name: 'deliverable',
    title: 'Deliverable',
    type: 'array',
    hidden,
    of: [
      {
        type: 'object',
        name: 'deliverableItem',
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
  })
}

function periodDeliverablesField(hidden?: boolean) {
  return defineField({
    name: 'periodDeliverables',
    title: 'Period Deliverables',
    type: 'array',
    hidden,
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
          },
          { name: 'submittedAt', title: 'Submitted At', type: 'datetime' },
          deliverableArrayField(),
          reviewThreadField(
            'deliverableReviewThread',
            'Deliverable Review Thread',
            'periodDeliverableReviewEntry',
            'Back-and-forth between officer and supervisor on main deliverable for this period.',
          ),
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
  })
}

function officerWorkFields() {
  return [
    defineField({
      name: 'assignee',
      title: 'Assignee',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: TASK_STATUS_OPTIONS, layout: 'dropdown' },
      initialValue: 'to_do',
    }),
    defineField({
      name: 'inputs',
      title: 'Inputs',
      type: 'object',
      fields: [
        { name: 'file', title: 'File', type: 'file' },
        { name: 'submittedAt', title: 'Submitted At', type: 'datetime' },
      ],
    }),
    reviewThreadField(
      'inputsReviewThread',
      'Inputs Review Thread',
      'inputsReviewEntry',
      'Trackable back-and-forth between officer and supervisor on inputs.',
    ),
    deliverableArrayField(),
    reviewThreadField(
      'deliverableReviewThread',
      'Deliverable Review Thread',
      'deliverableReviewEntry',
      'Trackable back-and-forth between officer and supervisor on main deliverable.',
    ),
    periodDeliverablesField(),
  ]
}

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
      name: 'officerWork',
      title: 'Officer work',
      type: 'array',
      description:
        'Independent work copy per assigned officer (status, inputs, deliverables).',
      of: [
        {
          type: 'object',
          name: 'detailedTaskOfficerWork',
          fields: officerWorkFields(),
          preview: {
            select: { assigneeName: 'assignee.fullName', status: 'status' },
            prepare({ assigneeName, status }) {
              return {
                title: assigneeName || 'Unassigned officer',
                subtitle: status || 'to_do',
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'assignee',
      title: 'Assignee',
      type: 'reference',
      to: [{ type: 'staff' }],
      hidden: true,
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
      hidden: true,
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
      hidden: true,
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
      hidden: true,
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
      hidden: true,
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
      hidden: true,
    }),
    defineField({
      name: 'cascadeKind',
      title: 'Cascade kind',
      type: 'string',
      options: {
        list: [
          { title: 'Owned', value: 'owned' },
          { title: 'Cascaded from manager', value: 'cascaded' },
        ],
      },
      initialValue: 'owned',
    }),
    defineField({
      name: 'cascadeSource',
      title: 'Cascade source',
      type: 'cascadeSource',
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
      hidden: true,
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
