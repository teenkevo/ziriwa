import { defineField, defineType } from 'sanity'

const DIFFICULTY_OPTIONS = [
  { title: 'Beginner', value: 'beginner' },
  { title: 'Intermediate', value: 'intermediate' },
  { title: 'Advanced', value: 'advanced' },
  { title: 'Expert', value: 'expert' },
] as const

const QUESTION_TYPE_OPTIONS = [
  { title: 'Single choice', value: 'single_choice' },
  { title: 'Multiple choice', value: 'multiple_choice' },
] as const

const OPTION_LABEL_OPTIONS = [
  { title: 'A', value: 'A' },
  { title: 'B', value: 'B' },
  { title: 'C', value: 'C' },
  { title: 'D', value: 'D' },
  { title: 'E', value: 'E' },
] as const

export const assessmentQuestionOption = defineType({
  name: 'assessmentQuestionOption',
  title: 'Assessment Question Option',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      options: {
        list: OPTION_LABEL_OPTIONS as unknown as { title: string; value: string }[],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Option text',
      type: 'text',
      rows: 2,
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: { label: 'label', text: 'text' },
    prepare({ label, text }) {
      return {
        title: `${label ?? '?'}: ${(text ?? '').slice(0, 60)}`,
      }
    },
  },
})

export const assessmentQuestion = defineType({
  name: 'assessmentQuestion',
  title: 'Assessment Question',
  type: 'object',
  fields: [
    defineField({
      name: 'questionId',
      title: 'Question ID',
      type: 'string',
      description: 'External reference code (e.g. DOP01)',
    }),
    defineField({
      name: 'subtopic',
      title: 'Subtopic',
      type: 'string',
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      options: {
        list: DIFFICULTY_OPTIONS as unknown as { title: string; value: string }[],
      },
      initialValue: 'intermediate',
    }),
    defineField({
      name: 'questionType',
      title: 'Question type',
      type: 'string',
      options: {
        list: QUESTION_TYPE_OPTIONS as unknown as { title: string; value: string }[],
      },
      initialValue: 'single_choice',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Short description',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Question body',
      type: 'text',
      rows: 4,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      of: [{ type: 'assessmentQuestionOption' }],
      validation: Rule => Rule.min(2).required(),
    }),
    defineField({
      name: 'correctAnswers',
      title: 'Correct answers',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Option labels, e.g. A or A,B,C for multiple choice',
      validation: Rule => Rule.min(1).required(),
    }),
    defineField({
      name: 'explanation',
      title: 'Explanation',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {
      questionId: 'questionId',
      title: 'title',
      questionType: 'questionType',
    },
    prepare({ questionId, title, questionType }) {
      const prefix = questionId ? `${questionId} · ` : ''
      return {
        title: `${prefix}${title ?? 'Question'}`,
        subtitle: questionType,
      }
    },
  },
})
