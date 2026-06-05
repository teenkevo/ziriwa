import { defineField, defineType } from 'sanity'

/**
 * Project manager contract — one per project per financial year.
 * Deputy PM, workstream lead, and member contracts cascade from this (or from their direct upstream).
 */
export const projectContract = defineType({
  name: 'projectContract',
  title: 'Project Contract',
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
      name: 'projectManager',
      title: 'Project Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
      description:
        'Project manager; contract cascades to workstream leads and members',
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
        title: project ? `${project} – ${fy || ''}` : 'Project Contract',
        subtitle: fy,
      }
    },
  },
})
