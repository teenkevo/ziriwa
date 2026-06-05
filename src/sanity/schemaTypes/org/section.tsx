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
      name: 'manager',
      title: 'Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Staff member (Manager role) heading this section',
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
    },
    prepare(selection) {
      const { name, division } = selection
      return {
        title: name || 'Unnamed Section',
        subtitle: division ? `in ${division}` : undefined,
      }
    },
  },
})
