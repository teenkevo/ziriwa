import { defineField, defineType } from 'sanity'

const ROLE_OPTIONS = [
  { title: 'Commissioner General', value: 'commissioner_general' },
  { title: 'Commissioner', value: 'commissioner' },
  { title: 'Assistant Commissioner', value: 'assistant_commissioner' },
  { title: 'Manager', value: 'manager' },
  { title: 'Supervisor', value: 'supervisor' },
  { title: 'Officer', value: 'officer' },
] as const

export const staff = defineType({
  name: 'staff',
  title: 'Staff',
  type: 'document',
  fields: [
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: Rule => Rule.max(50),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      validation: Rule => Rule.max(50),
    }),
    defineField({
      name: 'idNumber',
      title: 'ID Number',
      type: 'string',
      description: 'Staff identification number',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      description: 'Must end with @ura.go.ug',
      validation: Rule =>
        Rule.required()
          .email()
          .custom(
            email =>
              !email ||
              email.toLowerCase().endsWith('@ura.go.ug') ||
              'Email must end with @ura.go.ug',
          ),
    }),
    defineField({
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
      description: 'Legacy: use firstName+lastName for new staff',
    }),
    defineField({
      name: 'staffId',
      title: 'Staff ID',
      type: 'string',
      description: 'Legacy/alternate identifier (e.g. CG-001, AC-002)',
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      options: {
        list: ROLE_OPTIONS as any,
        layout: 'dropdown',
      },
      validation: Rule => Rule.required(),
      description:
        'Commissioner General heads ITID; Commissioners head departments; Assistant Commissioners head divisions; Managers head sections; Supervisors and Officers report to managers',
    }),
    defineField({
      name: 'reportsTo',
      title: 'Reports To',
      type: 'reference',
      to: [{ type: 'staff' }],
      description: 'Direct supervisor in the hierarchy',
    }),
    defineField({
      name: 'division',
      title: 'Division',
      type: 'reference',
      to: [{ type: 'division' }],
      description:
        'Division this staff belongs to (for Assistant Commissioners, Managers, etc.)',
      hidden: ({ value, parent }) =>
        !value &&
        (parent as { role?: string })?.role === 'commissioner_general',
    }),
    defineField({
      name: 'section',
      title: 'Section',
      type: 'reference',
      to: [{ type: 'section' }],
      description: 'Section this staff heads or belongs to (for Managers)',
      hidden: ({ value, parent }) => {
        const role = (parent as { role?: string })?.role
        return (
          !value && !['manager', 'supervisor', 'officer'].includes(role || '')
        )
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
      firstName: 'firstName',
      lastName: 'lastName',
      role: 'role',
      staffId: 'staffId',
      idNumber: 'idNumber',
    },
    prepare(selection) {
      const { firstName, lastName, role, staffId, idNumber } = selection
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const roleLabels: Record<string, string> = {
        commissioner_general: 'CG',
        commissioner: 'Comm',
        assistant_commissioner: 'AC',
        manager: 'Mgr',
        supervisor: 'Sup',
        officer: 'Off',
      }
      const roleLabel = roleLabels[role as string] || role
      return {
        title: fullName || 'Unnamed',
        subtitle: [staffId || idNumber, roleLabel].filter(Boolean).join(' • '),
      }
    },
  },
})
