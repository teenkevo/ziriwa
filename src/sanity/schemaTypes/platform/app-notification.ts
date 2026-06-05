import { defineField, defineType } from 'sanity'

export const appNotification = defineType({
  name: 'appNotification',
  title: 'App Notification',
  type: 'document',
  fields: [
    defineField({
      name: 'recipient',
      title: 'Recipient',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'workspaceScope',
      title: 'Workspace scope',
      type: 'string',
      options: {
        list: [
          { title: 'Mainstream', value: 'mainstream' },
          { title: 'Projects', value: 'projects' },
        ],
      },
      initialValue: 'mainstream',
    }),
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{ type: 'project' }],
      description: 'Set for project workspace notifications.',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'string',
    }),
    defineField({
      name: 'readAt',
      title: 'Read at',
      type: 'datetime',
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'text',
      description: 'JSON payload for client routing',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'type' },
  },
})
