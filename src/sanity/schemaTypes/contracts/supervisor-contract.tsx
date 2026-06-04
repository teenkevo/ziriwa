import { defineField, defineType } from 'sanity'

/**
 * One contract per supervisor per section per financial year.
 * Supervisor-owned SSMARTA objectives → initiatives → measurable activities.
 */
export const supervisorContract = defineType({
  name: 'supervisorContract',
  title: 'Supervisor Contract',
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
      name: 'supervisor',
      title: 'Supervisor',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Section supervisor who owns this contract',
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Active', value: 'active' },
          { title: 'Completed', value: 'completed' },
        ],
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'objectives',
      title: 'SSMARTA Objectives',
      type: 'array',
      of: [{ type: 'ssmartaObjective' }],
    }),
    defineField({
      name: 'cascadeRevision',
      title: 'Cascade revision',
      type: 'number',
      description:
        'Incremented when this contract changes after items were cascaded to officer contracts',
      initialValue: 0,
    }),
    defineField({
      name: 'pendingCascadeUpdate',
      title: 'Pending cascade update',
      type: 'object',
      fields: [
        {
          name: 'sectionContractRevision',
          title: 'Manager contract revision',
          type: 'number',
        },
        {
          name: 'detectedAt',
          title: 'Detected at',
          type: 'datetime',
        },
        {
          name: 'sectionContractId',
          title: 'Section contract',
          type: 'string',
        },
      ],
      description:
        'Set when the manager contract changes after items were cascaded; supervisor must apply updates',
    }),
  ],
  preview: {
    select: {
      section: 'section.name',
      supervisor: 'supervisor.fullName',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { section, supervisor, fy } = selection
      return {
        title: section
          ? `${section} – ${supervisor ?? 'Supervisor'}`
          : 'Supervisor Contract',
        subtitle: fy,
      }
    },
  },
})
