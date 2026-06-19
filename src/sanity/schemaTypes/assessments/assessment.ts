import { defineField, defineType } from 'sanity'

const STATUS_OPTIONS = [
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' },
  { title: 'Archived', value: 'archived' },
] as const

export const assessment = defineType({
  name: 'assessment',
  title: 'Assessment',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: STATUS_OPTIONS as unknown as { title: string; value: string }[],
      },
      initialValue: 'draft',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      of: [{ type: 'assessmentQuestion' }],
    }),
    defineField({
      name: 'createdBy',
      title: 'Created by',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
    }),
    defineField({
      name: 'dueDate',
      title: 'Due date',
      type: 'date',
    }),
    defineField({
      name: 'timeLimitMinutes',
      title: 'Time limit (minutes)',
      type: 'number',
      description:
        'Optional per-attempt time limit once an officer starts the assessment.',
      validation: Rule => Rule.min(1).integer(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      sectionName: 'section.name',
    },
    prepare({ title, status, sectionName }) {
      return {
        title: title ?? 'Assessment',
        subtitle: [sectionName, status].filter(Boolean).join(' · '),
      }
    },
  },
})
