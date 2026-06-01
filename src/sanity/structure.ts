import {
  ActivityIcon,
  CalendarIcon,
  DocumentsIcon,
  MasterDetailIcon,
  TransferIcon,
  UsersIcon,
} from '@sanity/icons'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'

/** Document types shown in the Studio sidebar (object types are excluded). */
const STUDIO_GROUPS = {
  org: {
    title: 'Organization',
    icon: MasterDetailIcon,
    types: ['department', 'division', 'section', 'staff'],
  },
  contracts: {
    title: 'Performance contracts',
    icon: DocumentsIcon,
    types: [
      'departmentContract',
      'divisionContract',
      'sectionContract',
      'supervisorContract',
      'officerContract',
    ],
  },
  delegation: {
    title: 'Delegation & transfers',
    icon: TransferIcon,
    types: ['sectionDelegation', 'orgRoleDelegation', 'staffTransferRequest'],
  },
  stakeholders: {
    title: 'Stakeholders',
    icon: UsersIcon,
    types: ['stakeholderEntry', 'stakeholderEngagement'],
  },
  sprints: {
    title: 'Sprints & work',
    icon: CalendarIcon,
    types: ['weeklySprint', 'sprintTask', 'workSubmission'],
  },
  platform: {
    title: 'Platform',
    icon: ActivityIcon,
    types: ['auditLogEntry', 'auditLogBatch', 'appNotification', 'boardAction'],
  },
} as const

const GROUP_ORDER = [
  'org',
  'contracts',
  'delegation',
  'stakeholders',
  'sprints',
  'platform',
] as const satisfies readonly (keyof typeof STUDIO_GROUPS)[]

function documentTypeItems(S: StructureBuilder, types: readonly string[]) {
  return types.map(type => S.documentTypeListItem(type))
}

function groupedListItem(
  S: StructureBuilder,
  id: string,
  config: (typeof STUDIO_GROUPS)[keyof typeof STUDIO_GROUPS],
) {
  return S.listItem()
    .id(id)
    .title(config.title)
    .icon(config.icon)
    .child(
      S.list()
        .id(`${id}-list`)
        .title(config.title)
        .items(documentTypeItems(S, config.types)),
    )
}

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = S => {
  const items = []
  for (let i = 0; i < GROUP_ORDER.length; i++) {
    const groupKey = GROUP_ORDER[i]!
    items.push(groupedListItem(S, groupKey, STUDIO_GROUPS[groupKey]))
    if (i < GROUP_ORDER.length - 1) {
      items.push(S.divider())
    }
  }

  return S.list().id('content-root').title('Content').items(items)
}
