import { defineField, defineType } from 'sanity'

export const section = defineType({
  name: 'section',
  title: 'Section',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Section name (e.g. Data Science, Data Engineering)',
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{ type: 'project' }],
      description:
        'When set, this section is a project workstream (not mainstream org structure)',
    }),
    defineField({
      name: 'workstreamLead',
      title: 'Workstream Lead',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Supervisor-equivalent for this project workstream',
      hidden: ({ parent }) => !(parent as { project?: unknown })?.project,
    }),
    defineField({
      name: 'division',
      title: 'Division',
      type: 'reference',
      to: [{ type: 'division' }],
      description: 'Division this section belongs to (mainstream only)',
      validation: Rule =>
        Rule.custom((division, context) => {
          const parent = context.parent as { project?: unknown }
          if (parent?.project) return true
          return division ? true : 'Division is required for mainstream sections'
        }),
    }),
    defineField({
      name: 'isPlanningSection',
      title: 'Planning Section',
      type: 'boolean',
      initialValue: false,
      description:
        'Planning sections have no manager. Supervisors report directly to the Assistant Commissioner.',
    }),
    defineField({
      name: 'manager',
      title: 'Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Staff member (Manager role) heading this section',
      hidden: ({ parent }) =>
        Boolean((parent as { isPlanningSection?: boolean })?.isPlanningSection),
      validation: Rule =>
        Rule.custom((manager, context) => {
          const parent = context.parent as
            | { isPlanningSection?: boolean; project?: unknown }
            | undefined
          if (parent?.project || parent?.isPlanningSection) return true
          return manager ? true : 'Manager is required for standard sections'
        }),
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Order for display in dashboards (lower = first)',
    }),
  ],
  preview: {
    select: {
      name: 'name',
      division: 'division.name',
      isPlanningSection: 'isPlanningSection',
    },
    prepare(selection) {
      const { name, division, isPlanningSection } = selection
      const parts = [
        isPlanningSection ? 'Planning' : null,
        division ? `in ${division}` : null,
      ].filter(Boolean)
      return {
        title: name || 'Unnamed Section',
        subtitle: parts.length > 0 ? parts.join(' · ') : undefined,
      }
    },
  },
})
