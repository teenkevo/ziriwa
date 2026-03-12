import { defineField, defineType } from 'sanity'

/**
 * Stakeholder engagement matrix for a section.
 * One document per section per financial year (aligned with section contracts).
 * Contains an array of stakeholder entries.
 */
export const stakeholderEngagement = defineType({
  name: 'stakeholderEngagement',
  title: 'Stakeholder Engagement',
  type: 'document',
  fields: [
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      validation: Rule => Rule.required(),
      description: 'Section this engagement matrix belongs to',
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      description: 'e.g. FY-2025/2026 (July 1 - June 30)',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'stakeholders',
      title: 'Stakeholders',
      type: 'array',
      of: [{ type: 'stakeholderEntry' }],
      description: 'Stakeholder entries in the engagement matrix',
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
        title: section ? `Stakeholder Engagement – ${section}` : 'Stakeholder Engagement',
        subtitle: fy,
      }
    },
  },
})
