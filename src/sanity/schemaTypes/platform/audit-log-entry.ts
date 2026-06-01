import { defineField, defineType } from 'sanity'

/** Embedded entry — stored in batches, not as standalone documents. */
export const auditLogEntry = defineType({
  name: 'auditLogEntry',
  title: 'Audit log entry',
  type: 'object',
  fields: [
    defineField({
      name: 'timestamp',
      title: 'Timestamp',
      type: 'datetime',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'authorName',
      title: 'Author name',
      type: 'string',
    }),
    defineField({
      name: 'authorEmail',
      title: 'Author email',
      type: 'string',
    }),
    defineField({
      name: 'authorStaffId',
      title: 'Author staff',
      type: 'string',
    }),
    defineField({
      name: 'change',
      title: 'Change',
      type: 'string',
      description: 'e.g. CREATED, UPDATED, APPROVED',
    }),
    defineField({
      name: 'resourceType',
      title: 'Resource type',
      type: 'string',
    }),
    defineField({
      name: 'resourceId',
      title: 'Resource ID',
      type: 'string',
    }),
    defineField({
      name: 'resourceLabel',
      title: 'Resource label',
      type: 'string',
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'string',
    }),
    defineField({
      name: 'actionKey',
      title: 'Action key',
      type: 'string',
      description: 'Stable app action id, e.g. weekly-sprint.review-task',
    }),
    defineField({
      name: 'previousValue',
      title: 'Previous value',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'newValue',
      title: 'New value',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'scopeSectionId',
      title: 'Scope section',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'message',
      subtitle: 'change',
      resource: 'resourceType',
    },
    prepare({ title, subtitle, resource }) {
      return {
        title: title ?? 'Audit entry',
        subtitle: [resource, subtitle].filter(Boolean).join(' · '),
      }
    },
  },
})
