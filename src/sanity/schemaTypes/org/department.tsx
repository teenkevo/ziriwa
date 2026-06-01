import { defineField, defineType, SanityDocument } from 'sanity'

export const department = defineType({
  name: 'department',
  title: 'Department',
  type: 'document',
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full Department Name',
      type: 'string',
      description:
        'Full department title (e.g. Information Technology and Innovation Department)',
      validation: Rule => Rule.required().max(150),
    }),
    defineField({
      name: 'acronym',
      title: 'Acronym',
      type: 'string',
      description: 'Short form (e.g. ITID, optional)',
      validation: Rule => Rule.max(20),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL-friendly identifier (e.g. itid, human-resources)',
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
      name: 'commissioner',
      title: 'Commissioner',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Commissioner heading this department',
    }),
    defineField({
      name: 'isDefault',
      title: 'Default Department',
      type: 'boolean',
      description:
        'Use as default when app loads (only one should be true)',
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
        title: acronym || fullName || 'Unnamed Department',
        subtitle: acronym && fullName ? fullName : undefined,
      }
    },
  },
})
