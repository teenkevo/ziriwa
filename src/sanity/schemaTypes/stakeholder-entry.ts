import { defineField, defineType } from 'sanity'

const POWER_INTEREST_OPTIONS = [
  { title: 'High', value: 'H' },
  { title: 'Medium', value: 'M' },
  { title: 'Low', value: 'L' },
] as const

const STAKEHOLDER_CATEGORY_OPTIONS = [
  { title: 'Regulatory body', value: 'regulatory_body' },
  { title: 'Community leader', value: 'community_leader' },
  { title: 'Supplier', value: 'supplier' },
  { title: 'Partner organization', value: 'partner_organization' },
  { title: 'Internal (other division/section)', value: 'internal' },
  { title: 'Other', value: 'other' },
] as const

const MODE_OF_ENGAGEMENT_OPTIONS = [
  { title: 'Meeting', value: 'meeting' },
  { title: 'Email', value: 'email' },
  { title: 'Report', value: 'report' },
  { title: 'Workshop', value: 'workshop' },
  { title: 'Phone call', value: 'phone_call' },
  { title: 'Site visit', value: 'site_visit' },
  { title: 'Other', value: 'other' },
] as const

/**
 * Single stakeholder entry in the engagement matrix.
 * Maps to one row in the Excel stakeholder engagement tool.
 */
export const stakeholderEntry = defineType({
  name: 'stakeholderEntry',
  title: 'Stakeholder Entry',
  type: 'object',
  fields: [
    defineField({
      name: 'sn',
      title: 'SN',
      type: 'number',
      description: 'Serial number',
    }),
    // Stakeholder identification
    defineField({
      name: 'stakeholder',
      title: 'Stakeholder',
      type: 'string',
      options: {
        list: STAKEHOLDER_CATEGORY_OPTIONS as unknown as { title: string; value: string }[],
        layout: 'dropdown',
      },
      description: 'Category/type of stakeholder',
    }),
    defineField({
      name: 'designation',
      title: 'Designation',
      type: 'string',
      description: 'Role or title of the individual',
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
      description: 'Full name of the stakeholder',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone Number',
      type: 'string',
    }),
    defineField({
      name: 'emailAddress',
      title: 'Email Address',
      type: 'string',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 2,
      description: 'Physical or postal address',
    }),
    // Optional link to contract initiative
    defineField({
      name: 'initiativeCode',
      title: 'Linked Initiative',
      type: 'string',
      description:
        'Optional. Link to an initiative from the section contract. Some engagements may be out of scope.',
    }),
    // Objective
    defineField({
      name: 'objectiveOfEngagement',
      title: 'Objective of the Engagement',
      type: 'text',
      rows: 3,
    }),
    // Mapping
    defineField({
      name: 'power',
      title: 'Power (H/M/L)',
      type: 'string',
      options: {
        list: POWER_INTEREST_OPTIONS as unknown as { title: string; value: string }[],
        layout: 'dropdown',
      },
      description: 'Level of influence over project outcomes',
    }),
    defineField({
      name: 'interest',
      title: 'Interest (H/M/L)',
      type: 'string',
      options: {
        list: POWER_INTEREST_OPTIONS as unknown as { title: string; value: string }[],
        layout: 'dropdown',
      },
      description: 'Level of interest in project progress and results',
    }),
    defineField({
      name: 'priority',
      title: 'Priority (H/M/L)',
      type: 'string',
      options: {
        list: POWER_INTEREST_OPTIONS as unknown as { title: string; value: string }[],
        layout: 'dropdown',
      },
      description: 'Overall priority for engagement (can be derived from power + interest)',
    }),
    // Expectations
    defineField({
      name: 'stakeholderExpectations',
      title: 'Stakeholder Expectations',
      type: 'text',
      rows: 2,
      description: 'What the stakeholder expects from the engagement',
    }),
    defineField({
      name: 'uraExpectations',
      title: 'What You Expect',
      type: 'text',
      rows: 2,
      description: 'What you (the plan creator) expect from the stakeholder',
    }),
    defineField({
      name: 'proposedDateOfEngagement',
      title: 'Proposed Date of Engagement',
      type: 'date',
    }),
    // Communications
    defineField({
      name: 'modeOfEngagement',
      title: 'Mode of Engagement',
      type: 'string',
      options: {
        list: MODE_OF_ENGAGEMENT_OPTIONS as unknown as { title: string; value: string }[],
        layout: 'dropdown',
      },
      description: 'How the engagement will take place (meeting, email, report, etc.)',
    }),
    // Budget and resources
    defineField({
      name: 'budgetHighlights',
      title: 'Budget Highlights',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'totalCost',
      title: 'Total Cost',
      type: 'number',
    }),
    defineField({
      name: 'uraDelegation',
      title: 'Engagement Lead',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Anyone from within the section who will lead the engagement',
    }),
    defineField({
      name: 'engagementReport',
      title: 'Engagement Report',
      type: 'text',
      rows: 6,
      description:
        'Report submitted on or after the proposed engagement date. Rich text supported.',
    }),
  ],
  preview: {
    select: { name: 'name', designation: 'designation' },
    prepare({ name, designation }) {
      return {
        title: name || 'Unnamed Stakeholder',
        subtitle: designation,
      }
    },
  },
})
