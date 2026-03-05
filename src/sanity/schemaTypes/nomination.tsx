import { defineField, defineType } from 'sanity'

export const nomination = defineType({
  name: 'nomination',
  title: 'Nomination',
  type: 'document',
  fields: [
    {
      name: 'position',
      title: 'Position',
      type: 'reference',
      to: [{ type: 'position' }],
      description: 'The position this nomination is for',
      validation: Rule => Rule.required(),
    },
    {
      name: 'nominee',
      title: 'Nominee',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'The member being nominated',
      validation: Rule => Rule.required(),
    },
    {
      name: 'nominatedBy',
      title: 'Nominated By',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'The member who made this nomination',
      validation: Rule => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Nomination status',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Accepted', value: 'accepted' },
          { title: 'Withdrawn', value: 'withdrawn' },
        ],
      },
      initialValue: 'pending',
      validation: Rule => Rule.required(),
    },
    {
      name: 'acceptedForVoting',
      title: 'Accepted for Voting',
      type: 'boolean',
      description: 'Whether this nomination is available for voting',
      initialValue: false,
    },
    {
      name: 'nominationDate',
      title: 'Nomination Date',
      type: 'date',
      description: 'When this nomination was made',
      validation: Rule => Rule.required(),
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'text',
      description: 'Optional notes about this nomination',
    },
  ],
  preview: {
    select: {
      nomineeName: 'nominee.fullName',
      positionTitle: 'position.title',
      status: 'status',
      nominatedByName: 'nominatedBy.fullName',
    },
    prepare(selection) {
      const { nomineeName, positionTitle, status, nominatedByName } = selection
      return {
        title: `${nomineeName} for ${positionTitle}`,
        subtitle: `Nominated by ${nominatedByName} • ${status}`,
      }
    },
  },
})

