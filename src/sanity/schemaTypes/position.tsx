import { defineField, defineType } from 'sanity'

export const position = defineType({
  name: 'position',
  title: 'Executive Position',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Position Title',
      type: 'string',
      description: 'e.g., "President", "Secretary", "Treasurer"',
      validation: Rule => Rule.required().max(100),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Brief description of the position responsibilities',
    },
    {
      name: 'committeeYear',
      title: 'Committee Year',
      type: 'number',
      description: 'The year this position is for (e.g., 2025)',
      validation: Rule => Rule.required().integer().min(2000).max(2100),
    },
    {
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Whether this position is currently open for nominations',
      initialValue: true,
    },
  ],
  preview: {
    select: {
      title: 'title',
      year: 'committeeYear',
      active: 'isActive',
    },
    prepare(selection) {
      const { title, year, active } = selection
      return {
        title,
        subtitle: `${year} ${active ? '• Active' : '• Closed'}`,
      }
    },
  },
})
