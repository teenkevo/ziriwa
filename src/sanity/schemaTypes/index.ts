import { type SchemaTypeDefinition } from 'sanity'

import {
  department,
  division,
  project,
  projectMember,
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
  projectContract,
  deputyProjectContract,
  ssmartaObjective,
  supervisorContract,
} from './contracts'
import {
  orgRoleDelegation,
  sectionDelegation,
  staffTransferRequest,
} from './delegation'
import { sprintTask, weeklySprint, workSubmission } from './sprints'
import {
  stakeholderActionPoint,
  stakeholderEngagement,
  stakeholderEntry,
  stakeholderMinutes,
  stakeholderMinutesApproval,
} from './stakeholders'
import {
  appNotification,
  auditLogBatch,
  auditLogEntry,
  boardAction,
  auditQuery,
} from './platform'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Platform
    auditLogEntry,
    auditLogBatch,
    appNotification,
    boardAction,
    auditQuery,
    // Org structure
    department,
    division,
    staff,
    project,
    projectMember,
    section,
    // Delegation & transfers
    sectionDelegation,
    orgRoleDelegation,
    staffTransferRequest,
    // Performance contracts (documents + nested objects)
  sectionContract,
  projectContract,
  deputyProjectContract,
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
    stakeholderActionPoint,
    stakeholderMinutesApproval,
    stakeholderMinutes,
    stakeholderEntry,
    stakeholderEngagement,
    // Sprints & work
    sprintTask,
    workSubmission,
    weeklySprint,
  ],
}
