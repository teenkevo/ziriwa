import { defineField, defineType } from 'sanity'

export const assessmentAttemptAnswer = defineType({
  name: 'assessmentAttemptAnswer',
  title: 'Assessment Attempt Answer',
  type: 'object',
  fields: [
    defineField({
      name: 'questionKey',
      title: 'Question key',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'selectedAnswers',
      title: 'Selected answers',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})

export const assessmentAttempt = defineType({
  name: 'assessmentAttempt',
  title: 'Assessment Attempt',
  type: 'document',
  fields: [
    defineField({
      name: 'assessment',
      title: 'Assessment',
      type: 'reference',
      to: [{ type: 'assessment' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'officer',
      title: 'Officer',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'answers',
      title: 'Answers',
      type: 'array',
      of: [{ type: 'assessmentAttemptAnswer' }],
    }),
    defineField({
      name: 'score',
      title: 'Score',
      type: 'number',
    }),
    defineField({
      name: 'maxScore',
      title: 'Max score',
      type: 'number',
    }),
    defineField({
      name: 'percentScore',
      title: 'Percent score',
      type: 'number',
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted at',
      type: 'datetime',
    }),
    defineField({
      name: 'startedAt',
      title: 'Started at',
      type: 'datetime',
    }),
    defineField({
      name: 'expiresAt',
      title: 'Expires at',
      type: 'datetime',
    }),
    defineField({
      name: 'submissionReason',
      title: 'Submission reason',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'Timeout', value: 'timeout' },
          { title: 'Abandoned', value: 'abandoned' },
        ],
      },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'In progress', value: 'in_progress' },
          { title: 'Submitted', value: 'submitted' },
        ],
      },
      initialValue: 'submitted',
    }),
  ],
  preview: {
    select: {
      assessmentTitle: 'assessment.title',
      officerName: 'officer.fullName',
      score: 'score',
      maxScore: 'maxScore',
    },
    prepare({ assessmentTitle, officerName, score, maxScore }) {
      const scoreLabel =
        score != null && maxScore != null ? `${score}/${maxScore}` : ''
      return {
        title: assessmentTitle ?? 'Attempt',
        subtitle: [officerName, scoreLabel].filter(Boolean).join(' · '),
      }
    },
  },
})
