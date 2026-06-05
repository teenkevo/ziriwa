import { defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'projectManager',
      title: 'Project Manager',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Head of the project; contract cascades to workstream leads',
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
          { title: 'Active', value: 'active' },
          { title: 'Archived', value: 'archived' },
        ],
      },
      initialValue: 'active',
    }),
  ],
  preview: {
    select: { name: 'name', status: 'status' },
    prepare({ name, status }) {
      return {
        title: name || 'Project',
        subtitle: status === 'archived' ? 'Archived' : 'Active',
      }
    },
  },
})
