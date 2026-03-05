import { defineField, defineType } from 'sanity'

export const attendanceVerification = defineType({
  name: 'attendanceVerification',
  title: 'Attendance Verification',
  type: 'document',
  fields: [
    defineField({
      name: 'meeting',
      title: 'Meeting',
      type: 'reference',
      to: [{ type: 'meeting' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'generatedAt',
      title: 'Generated At',
      type: 'datetime',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      meetingTitle: 'meeting.title',
      generatedAt: 'generatedAt',
    },
    prepare(selection) {
      const { meetingTitle, generatedAt } = selection
      const date = generatedAt ? new Date(generatedAt).toLocaleString() : ''
      return {
        title: meetingTitle || 'Attendance verification',
        subtitle: date,
      }
    },
  },
})
