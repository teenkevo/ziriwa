import { defineField, defineType } from 'sanity'

/**
 * Batched audit log shard — many entries per document to stay within Sanity
 * document count limits on hosted plans.
 */
export const auditLogBatch = defineType({
  name: 'auditLogBatch',
  title: 'Audit Log Batch',
  type: 'document',
  fields: [
    defineField({
      name: 'shardKey',
      title: 'Shard key',
      type: 'string',
      description: 'Typically YYYY-MM for monthly rotation',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'entries',
      title: 'Entries',
      type: 'array',
      of: [{ type: 'auditLogEntry' }],
    }),
    defineField({
      name: 'entryCount',
      title: 'Entry count',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),
    defineField({
      name: 'closedAt',
      title: 'Closed at',
      type: 'datetime',
      description: 'Set when batch is full and no longer accepts appends',
    }),
  ],
  preview: {
    select: { shardKey: 'shardKey', count: 'entryCount' },
    prepare({ shardKey, count }) {
      return {
        title: `Audit batch ${shardKey ?? '—'}`,
        subtitle: `${count ?? 0} entries`,
      }
    },
  },
})
