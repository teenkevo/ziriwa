import { defineField, defineType } from 'sanity'

/**
 * Pointer to a specific work submission nested under a sprint task.
 * Work submissions are not standalone documents, so this stores the sprint
 * reference plus the task and submission keys.
 */
export const stakeholderWorkSubmissionLink = defineType({
  name: 'stakeholderWorkSubmissionLink',
  title: 'Linked Sprint Work Submission',
  type: 'object',
  fields: [
    defineField({
      name: 'sprint',
      title: 'Weekly Sprint',
      type: 'reference',
      to: [{ type: 'weeklySprint' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'taskKey',
      title: 'Task Key',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'submissionKey',
      title: 'Submission Key',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
  ],
})
