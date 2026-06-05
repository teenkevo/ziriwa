import { defineField, defineType } from 'sanity'

/**
 * Deputy project manager contract — one per project per financial year.
 * Cascades from the project manager contract.
 */
export const deputyProjectContract = defineType({
  name: 'deputyProjectContract',
  title: 'Deputy Project Contract',
  type: 'document',
  fields: [
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{ type: 'project' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      description: 'e.g. FY-2025/2026',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'deputyProjectManager',
      title: 'Deputy Project Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
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
      initialValue: 0,
    }),
  ],
  preview: {
    select: { project: 'project.name', fy: 'financialYearLabel' },
    prepare({ project, fy }) {
      return {
        title: project ? `${project} (Deputy) – ${fy || ''}` : 'Deputy Project Contract',
        subtitle: fy,
      }
    },
  },
})
