import { defineField, defineType, SanityDocument } from 'sanity'

export const division = defineType({
  name: 'division',
  title: 'Division',
  type: 'document',
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full Division Name',
      type: 'string',
      description: 'Full division title (e.g. Data Innovations and Projects)',
      validation: Rule => Rule.required().max(100),
    }),
    defineField({
      name: 'acronym',
      title: 'Acronym',
      type: 'string',
      description: 'Short form (e.g. DIP, optional)',
      validation: Rule => Rule.max(20),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier (e.g. dip, it-security)',
      options: {
        source: (doc: SanityDocument) =>
          (doc as { acronym?: string; fullName?: string })?.acronym ||
          (doc as { acronym?: string; fullName?: string })?.fullName ||
          '',
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'assistantCommissioner',
      title: 'Assistant Commissioner',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Staff member heading this division',
    }),
    defineField({
      name: 'isDefault',
      title: 'Default Division',
      type: 'boolean',
      description: 'Use as default when app loads (only one should be true)',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      acronym: 'acronym',
      fullName: 'fullName',
    },
    prepare(selection) {
      const { acronym, fullName } = selection
      return {
        title: acronym || fullName || 'Unnamed Division',
        subtitle: acronym && fullName ? fullName : undefined,
      }
    },
  },
})
