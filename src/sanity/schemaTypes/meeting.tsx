import { defineField, defineType } from 'sanity'

export const meeting = defineType({
  name: 'meeting',
  title: 'Meeting',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required().max(200),
    }),
    defineField({
      name: 'meetingType',
      title: 'Meeting Type',
      type: 'string',
      options: {
        list: [
          { title: 'AGM', value: 'agm' },
          { title: 'Executive', value: 'executive' },
          { title: 'Ordinary', value: 'ordinary' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'meetingDate',
      title: 'Meeting Date',
      type: 'datetime',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'agenda',
      title: 'Agenda',
      type: 'file',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'financials',
      title: 'Financials',
      type: 'file',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'minutes',
      title: 'Minutes',
      type: 'file',
      // minutes can be uploaded later, so not required at creation time
    }),
    defineField({
      name: 'attendance',
      title: 'Attendance',
      type: 'array',
      readOnly: true,
      description: 'Managed via API when recording attendance',
      of: [
        {
          type: 'object',
          name: 'attendanceItem',
          fields: [
            {
              name: 'member',
              type: 'reference',
              to: [{ type: 'member' }],
              validation: Rule => Rule.required(),
            },
            {
              name: 'status',
              type: 'string',
              options: {
                list: [
                  { title: 'Present', value: 'present' },
                  { title: 'Absent', value: 'absent' },
                  { title: 'Excused', value: 'excused' },
                ],
              },
              validation: Rule => Rule.required(),
            },
            {
              name: 'excusedReason',
              type: 'string',
              description: 'Required when status is Excused',
              hidden: ({ parent }) => parent?.status !== 'excused',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'attendanceLockedAt',
      title: 'Attendance Locked At',
      type: 'datetime',
      description: 'When set, attendance for this meeting cannot be modified',
      readOnly: true,
    }),
    defineField({
      name: 'attendanceVerificationId',
      title: 'Attendance Verification ID',
      type: 'string',
      description: 'Document ID for QR code verification',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      meetingType: 'meetingType',
      meetingDate: 'meetingDate',
    },
    prepare(selection) {
      const { title, meetingType, meetingDate } = selection
      const typeLabelMap: Record<string, string> = {
        agm: 'AGM',
        executive: 'Executive',
        ordinary: 'Ordinary',
        other: 'Other',
      }

      const typeLabel = typeLabelMap[meetingType] ?? 'Meeting'
      const date = meetingDate ? new Date(meetingDate).toLocaleDateString() : ''

      return {
        title: title || 'Untitled Meeting',
        subtitle: [typeLabel, date].filter(Boolean).join(' • '),
      }
    },
  },
})
