import { defineField, defineType } from 'sanity'

export const vote = defineType({
  name: 'vote',
  title: 'Vote',
  type: 'document',
  fields: [
    {
      name: 'resolution',
      title: 'Resolution',
      type: 'reference',
      to: [{ type: 'resolution' }],
      description: 'The resolution being voted on',
      validation: Rule => Rule.required(),
    },
    {
      name: 'voter',
      title: 'Voter',
      type: 'reference',
      to: [{ type: 'member' }],
      description: 'The member casting this vote',
      validation: Rule => Rule.required(),
    },
    {
      name: 'voteType',
      title: 'Vote Type',
      type: 'string',
      description: 'Type of vote',
      options: {
        list: [
          { title: 'For', value: 'for' },
          { title: 'Against', value: 'against' },
          { title: 'Abstain', value: 'abstain' },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'nomination',
      title: 'Nomination',
      type: 'reference',
      to: [{ type: 'nomination' }],
      description: 'The nomination being voted on (for executive committee elections)',
    },
    {
      name: 'votedAt',
      title: 'Voted At',
      type: 'datetime',
      description: 'When this vote was cast',
      initialValue: () => new Date().toISOString(),
      validation: Rule => Rule.required(),
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'text',
      description: 'Optional notes about this vote',
    },
  ],
  preview: {
    select: {
      voterName: 'voter.fullName',
      resolutionTitle: 'resolution.title',
      voteType: 'voteType',
      nomineeName: 'nomination.nominee.fullName',
    },
    prepare(selection) {
      const { voterName, resolutionTitle, voteType, nomineeName } = selection
      const voteLabel = voteType === 'for' ? 'For' : voteType === 'against' ? 'Against' : 'Abstain'
      return {
        title: `${voterName}: ${voteLabel}`,
        subtitle: nomineeName 
          ? `${resolutionTitle} • ${nomineeName}`
          : resolutionTitle,
      }
    },
  },
})

