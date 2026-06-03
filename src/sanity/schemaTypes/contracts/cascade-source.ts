import { defineField, defineType } from 'sanity'

/** Lineage back to a manager section contract node (Manager → Supervisor cascade). */
export const cascadeSource = defineType({
  name: 'cascadeSource',
  title: 'Cascade Source',
  type: 'object',
  fields: [
    defineField({
      name: 'sectionContractId',
      title: 'Section contract',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'initiativeKey',
      title: 'Manager initiative key',
      type: 'string',
      description: 'Stable _key on manager contract initiative',
    }),
    defineField({
      name: 'activityKey',
      title: 'Manager activity key',
      type: 'string',
      description: 'Stable _key on manager KPI measurable activity',
    }),
    defineField({
      name: 'taskKey',
      title: 'Manager task key',
      type: 'string',
      description: 'Stable _key on manager detailed task',
    }),
    defineField({
      name: 'nodeRole',
      title: 'Node role',
      type: 'string',
      options: {
        list: [
          {
            title: 'Manager initiative → Supervisor objective',
            value: 'managerInitiativeAsObjective',
          },
          {
            title: 'Manager KPI → Supervisor initiative',
            value: 'managerKpiAsInitiative',
          },
          {
            title: 'Manager AIM → Supervisor measurable',
            value: 'managerAimAsMeasurable',
          },
          {
            title: 'Manager task → Supervisor task',
            value: 'managerTaskAsTask',
          },
        ],
      },
    }),
    defineField({
      name: 'importedFromRevision',
      title: 'Imported from revision',
      type: 'number',
      description: 'Section contract cascadeRevision when last imported/accepted',
    }),
  ],
})
