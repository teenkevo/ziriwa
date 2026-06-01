import { defineField, defineType } from 'sanity'

/**
 * One contract per officer per section per financial year.
 * Officer-owned SSMARTA objectives → initiatives → measurable activities.
 */
export const officerContract = defineType({
  name: 'officerContract',
  title: 'Officer Contract',
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
      name: 'officer',
      title: 'Officer',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Section officer who owns this contract',
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
  ],
  preview: {
    select: {
      section: 'section.name',
      officer: 'officer.fullName',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { section, officer, fy } = selection
      return {
        title: section
          ? `${section} – ${officer ?? 'Officer'}`
          : 'Officer Contract',
        subtitle: fy,
      }
    },
  },
})
