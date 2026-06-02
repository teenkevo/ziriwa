import { type SchemaTypeDefinition } from 'sanity'

import {
  department,
  division,
  section,
  staff,
} from './org'
import {
  cascadeSource,
  contractInitiative,
  departmentContract,
  detailedTask,
  divisionContract,
  measurableActivity,
  officerContract,
  sectionContract,
  ssmartaObjective,
  supervisorContract,
} from './contracts'
import {
  orgRoleDelegation,
  sectionDelegation,
  staffTransferRequest,
} from './delegation'
import { sprintTask, weeklySprint, workSubmission } from './sprints'
import { stakeholderEngagement, stakeholderEntry } from './stakeholders'
import {
  appNotification,
  auditLogBatch,
  auditLogEntry,
  boardAction,
} from './platform'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Platform
    auditLogEntry,
    auditLogBatch,
    appNotification,
    boardAction,
    // Org structure
    department,
    division,
    staff,
    section,
    // Delegation & transfers
    sectionDelegation,
    orgRoleDelegation,
    staffTransferRequest,
    // Performance contracts (documents + nested objects)
    sectionContract,
    departmentContract,
    divisionContract,
    supervisorContract,
    officerContract,
    cascadeSource,
    detailedTask,
    measurableActivity,
    contractInitiative,
    ssmartaObjective,
    // Stakeholders
    stakeholderEntry,
    stakeholderEngagement,
    // Sprints & work
    sprintTask,
    workSubmission,
    weeklySprint,
  ],
}
