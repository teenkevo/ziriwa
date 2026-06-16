import { defineField, defineType } from 'sanity'

/**
 * Pointer to a stakeholder row in an engagement matrix.
 */
export const workSubmissionStakeholderLink = defineType({
  name: 'workSubmissionStakeholderLink',
  title: 'Linked Stakeholder',
  type: 'object',
  fields: [
    defineField({
      name: 'engagement',
      title: 'Stakeholder Engagement',
      type: 'reference',
      to: [{ type: 'stakeholderEngagement' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'stakeholderKey',
      title: 'Stakeholder Key',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
  ],
})
