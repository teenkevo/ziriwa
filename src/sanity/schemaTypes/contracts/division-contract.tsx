import { defineField, defineType } from 'sanity'

/**
 * One contract per division per financial year.
 * Assistant Commissioner–owned: SSMARTA objectives → initiatives → measurable activities (no KPI/CRC split).
 */
export const divisionContract = defineType({
  name: 'divisionContract',
  title: 'Division Contract',
  type: 'document',
  fields: [
    defineField({
      name: 'division',
      title: 'Division',
      type: 'reference',
      to: [{ type: 'division' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'assistantCommissioner',
      title: 'Assistant Commissioner',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Assistant commissioner heading this division contract',
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
      division: 'division.fullName',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { division, fy } = selection
      return {
        title: division ? `${division} – ${fy || ''}` : 'Division Contract',
        subtitle: fy,
      }
    },
  },
})
