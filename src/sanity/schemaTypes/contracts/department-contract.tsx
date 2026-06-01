import { defineField, defineType } from 'sanity'

/**
 * One contract per department per financial year.
 * Commissioner-owned: SSMARTA objectives → initiatives → measurable activities (no KPI/CRC split).
 */
export const departmentContract = defineType({
  name: 'departmentContract',
  title: 'Department Contract',
  type: 'document',
  fields: [
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{ type: 'department' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'commissioner',
      title: 'Commissioner',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Commissioner heading this department contract',
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
      department: 'department.fullName',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { department, fy } = selection
      return {
        title: department ? `${department} – ${fy || ''}` : 'Department Contract',
        subtitle: fy,
      }
    },
  },
})
