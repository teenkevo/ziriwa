import { defineField, defineType } from 'sanity'

/**
 * Stakeholder engagement matrix for a section or a project.
 * One document per section (or project) per financial year.
 */
export const stakeholderEngagement = defineType({
  name: 'stakeholderEngagement',
  title: 'Stakeholder Engagement',
  type: 'document',
  fields: [
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      description: 'Mainstream section or project workstream (not the project itself)',
    }),
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{ type: 'project' }],
      description: 'Project-level engagement matrix (PM/DPM workspace)',
    }),
    defineField({
      name: 'financialYearLabel',
      title: 'Financial Year',
      type: 'string',
      description: 'e.g. FY-2025/2026 (July 1 - June 30)',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'stakeholders',
      title: 'Stakeholders',
      type: 'array',
      of: [{ type: 'stakeholderEntry' }],
      description: 'Stakeholder entries in the engagement matrix',
    }),
  ],
  validation: Rule =>
    Rule.custom((_, context) => {
      const doc = context.document as {
        section?: { _ref?: string }
        project?: { _ref?: string }
      }
      const hasSection = Boolean(doc?.section?._ref)
      const hasProject = Boolean(doc?.project?._ref)
      if (hasSection && hasProject) {
        return 'Link either a section or a project, not both'
      }
      if (!hasSection && !hasProject) {
        return 'Section or project is required'
      }
      return true
    }),
  preview: {
    select: {
      section: 'section.name',
      project: 'project.name',
      fy: 'financialYearLabel',
    },
    prepare(selection) {
      const { section, project, fy } = selection
      const scope = project
        ? `Project – ${project}`
        : section
          ? `Section – ${section}`
          : 'Stakeholder Engagement'
      return {
        title: scope,
        subtitle: fy,
      }
    },
  },
})
