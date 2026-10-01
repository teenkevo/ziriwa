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
      name: 'contractAlignment',
      title: 'Contract Alignment',
      type: 'string',
      initialValue: 'itil4',
      readOnly: true,
      options: {
        list: [
          { title: 'ITIL 4-Aligned', value: 'itil4' },
          { title: 'PMS-Aligned', value: 'pms' },
        ],
      },
      description:
        'Snapshot from the section at onboard time. Existing FY contracts keep their alignment if the section setting later changes.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Finalized', value: 'finalized' },
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
