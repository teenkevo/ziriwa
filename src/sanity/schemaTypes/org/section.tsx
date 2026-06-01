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
      name: 'division',
      title: 'Division',
      type: 'reference',
      to: [{ type: 'division' }],
      validation: Rule => Rule.required(),
      description: 'Division this section belongs to',
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
