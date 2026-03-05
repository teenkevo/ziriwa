import { defineField, defineType } from 'sanity'

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  description: 'Land and property assets - separate from unit trust investments',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'e.g. Plot 123 - Kyaliwajjala, Apartment 4B',
      validation: Rule => Rule.required().max(200),
    }),
    defineField({
      name: 'propertyType',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Land', value: 'land' },
          { title: 'Apartment', value: 'apartment' },
          { title: 'House', value: 'house' },
          { title: 'Building', value: 'building' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'dateAcquired',
      title: 'Date Acquired',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'landTitle',
      title: 'Land Title',
      type: 'file',
      description: 'Copy of the land title or title deed',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'documents',
      title: 'Other Documents',
      type: 'array',
      description: 'Additional relevant documents (sale agreement, survey, etc.)',
      of: [{ type: 'file' }],
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Address or area',
    }),
    defineField({
      name: 'plotNumber',
      title: 'Plot / Title Reference',
      type: 'string',
      description: 'Plot number or title deed reference',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Sold', value: 'sold' },
          { title: 'Transferred', value: 'transferred' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      name: 'name',
      propertyType: 'propertyType',
      location: 'location',
    },
    prepare(selection) {
      const { name, propertyType, location } = selection
      const typeLabelMap: Record<string, string> = {
        land: 'Land',
        apartment: 'Apartment',
        house: 'House',
        building: 'Building',
        other: 'Other',
      }
      const typeLabel = typeLabelMap[propertyType] ?? propertyType
      return {
        title: name || 'Untitled Property',
        subtitle: [typeLabel, location].filter(Boolean).join(' • '),
      }
    },
  },
})
