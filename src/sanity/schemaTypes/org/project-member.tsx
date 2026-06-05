import { defineField, defineType } from 'sanity'

const PROJECT_ROLE_OPTIONS = [
  { title: 'Project Manager', value: 'project_manager' },
  { title: 'Deputy Project Manager', value: 'deputy_project_manager' },
  { title: 'Workstream Lead', value: 'workstream_lead' },
  { title: 'Workstream Member', value: 'workstream_member' },
] as const

export const projectMember = defineType({
  name: 'projectMember',
  title: 'Project Member',
  type: 'document',
  fields: [
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      to: [{ type: 'project' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'staff',
      title: 'Staff',
      type: 'reference',
      to: [{ type: 'staff' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Project Role',
      type: 'string',
      options: { list: PROJECT_ROLE_OPTIONS as any, layout: 'dropdown' },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'workstream',
      title: 'Workstream',
      type: 'reference',
      to: [{ type: 'section' }],
      description: 'Required for workstream leads and members',
      hidden: ({ parent }) => {
        const role = (parent as { role?: string })?.role
        return role === 'project_manager' || role === 'deputy_project_manager'
      },
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Inactive', value: 'inactive' },
        ],
      },
      initialValue: 'active',
    }),
  ],
  preview: {
    select: {
      role: 'role',
      project: 'project.name',
      staffFirst: 'staff.firstName',
      staffLast: 'staff.lastName',
      workstream: 'workstream.name',
    },
    prepare({ role, project, staffFirst, staffLast, workstream }) {
      const name = [staffFirst, staffLast].filter(Boolean).join(' ')
      const roleLabels: Record<string, string> = {
        project_manager: 'PM',
        deputy_project_manager: 'Deputy PM',
        workstream_lead: 'Lead',
        workstream_member: 'Member',
      }
      return {
        title: name || 'Member',
        subtitle: [project, roleLabels[role as string] ?? role, workstream]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
