import { defineField, defineType } from 'sanity'

/**
 * One contract per section per financial year.
 * Self-contained: SSMARTA objectives → initiatives → activities (with evidence uploads).
 * Cascades from the section manager to supervisors and officers.
 */
export const sectionContract = defineType({
  name: 'sectionContract',
  title: 'Section Contract',
  type: 'document',
  fields: [
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      validation: Rule => Rule.required(),
      description: 'Section this contract belongs to',
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      description: 'e.g. FY-2025/2026 (July 1 - June 30). Current FY is computed from today.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'manager',
      title: 'Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
      description: 'Section manager; contract cascades to supervisors and officers under them',
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
      description: 'Objectives with initiatives (cross-cutting or KPI-driven) and activities',
    }),
  ],
  preview: {
    select: {
      section: 'section.name',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { section, fy } = selection
      return {
        title: section ? `${section} – ${fy || ''}` : 'Section Contract',
        subtitle: fy,
      }
    },
  },
})
