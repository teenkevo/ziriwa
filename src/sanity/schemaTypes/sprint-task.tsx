import { defineField, defineType } from 'sanity'

export const sprintTask = defineType({
  name: 'sprintTask',
  title: 'Sprint Task',
  type: 'object',
  fields: [
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'initiativeKey',
      title: 'Initiative Key',
      type: 'string',
      description: 'The _key of the linked initiative within the section contract',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'initiativeTitle',
      title: 'Initiative Title',
      type: 'string',
      description: 'Denormalized title for display',
    }),
    defineField({
      name: 'activityKey',
      title: 'Activity Key',
      type: 'string',
      description: 'The _key of the linked measurable activity within the initiative',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'activityTitle',
      title: 'Activity Title',
      type: 'string',
      description: 'Denormalized title for display',
    }),
    defineField({
      name: 'activityCategory',
      title: 'Activity Category',
      type: 'string',
      options: {
        list: [
          { title: 'Normal Flow', value: 'normal_flow' },
          { title: 'Compliance', value: 'compliance' },
          { title: 'Staff Development', value: 'staff_development' },
          { title: 'Stakeholder Engagement', value: 'stakeholder_engagement' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Review Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending Review', value: 'pending' },
          { title: 'Accepted', value: 'accepted' },
          { title: 'Rejected', value: 'rejected' },
          { title: 'Revisions Requested', value: 'revisions_requested' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'revisionReason',
      title: 'Revision Reason',
      type: 'text',
      rows: 2,
      description: 'Reason provided by the manager when requesting revisions',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
    }),
    defineField({
      name: 'assignee',
      title: 'Assigned Officer',
      type: 'reference',
      to: [{ type: 'staff' }],
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: {
        list: [
          { title: 'Highest', value: 'highest' },
          { title: 'High', value: 'high' },
          { title: 'Medium', value: 'medium' },
          { title: 'Low', value: 'low' },
          { title: 'Lowest', value: 'lowest' },
        ],
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'taskStatus',
      title: 'Task Status',
      type: 'string',
      description: 'Workflow status after the task is accepted',
      options: {
        list: [
          { title: 'To do', value: 'to_do' },
          { title: 'In progress', value: 'in_progress' },
          { title: 'Delivered', value: 'delivered' },
          { title: 'In review', value: 'in_review' },
          { title: 'Done', value: 'done' },
        ],
      },
      initialValue: 'to_do',
    }),
    defineField({
      name: 'workSubmissions',
      title: 'Work Submissions',
      type: 'array',
      of: [{ type: 'workSubmission' }],
    }),
  ],
  preview: {
    select: {
      description: 'description',
      status: 'status',
    },
    prepare({ description, status }) {
      const statusLabels: Record<string, string> = {
        pending: '⏳ Pending',
        accepted: '✅ Accepted',
        rejected: '❌ Rejected',
        revisions_requested: '🔄 Revisions',
      }
      return {
        title: description || 'Untitled Task',
        subtitle: statusLabels[status] || status,
      }
    },
  },
})
