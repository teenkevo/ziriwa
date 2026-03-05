import { defineField, defineType } from 'sanity'

export const resolution = defineType({
  name: 'resolution',
  title: 'Resolution',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Resolution Title',
      type: 'string',
      description: 'Short title for the resolution',
      validation: Rule => Rule.required().max(200),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Full description of what this resolution is about',
      validation: Rule => Rule.required(),
    },
    {
      name: 'resolutionType',
      title: 'Resolution Type',
      type: 'string',
      description: 'Type of resolution',
      options: {
        list: [
          { title: 'Executive Committee Election', value: 'executive_committee' },
          { title: 'General Resolution', value: 'general' },
          { title: 'Policy Change', value: 'policy' },
          { title: 'Other', value: 'other' },
        ],
      },
      initialValue: 'general',
      validation: Rule => Rule.required(),
    },
    {
      name: 'committeeYear',
      title: 'Committee Year',
      type: 'number',
      description: 'The year this resolution applies to (if applicable)',
      validation: Rule => Rule.integer().min(2000).max(2100),
    },
    {
      name: 'meetingDate',
      title: 'Meeting Date',
      type: 'date',
      description: 'Date of the AGM meeting',
      validation: Rule => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Current status of the resolution',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Open for Voting', value: 'open' },
          { title: 'Closed', value: 'closed' },
          { title: 'Passed', value: 'passed' },
          { title: 'Rejected', value: 'rejected' },
        ],
      },
      initialValue: 'draft',
      validation: Rule => Rule.required(),
    },
    {
      name: 'positions',
      title: 'Positions',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'position' }],
        },
      ],
      description: 'Positions associated with this resolution (for executive committee elections)',
    },
    {
      name: 'createdBy',
      title: 'Created By',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'Member who created this resolution',
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      description: 'When this resolution was created',
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      type: 'resolutionType',
      year: 'committeeYear',
    },
    prepare(selection) {
      const { title, status, type, year } = selection
      const typeLabel = type === 'executive_committee' ? 'Executive Committee' : 'General'
      return {
        title,
        subtitle: `${typeLabel} ${year ? `• ${year}` : ''} • ${status}`,
      }
    },
  },
})

