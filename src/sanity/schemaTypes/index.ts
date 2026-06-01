import { type SchemaTypeDefinition } from 'sanity'
import { detailedTask } from './detailed-task'
import { measurableActivity } from './measurable-activity'
import { contractInitiative } from './contract-initiative'
import { ssmartaObjective } from './ssmarta-objective'
import { department } from './department'
import { division } from './division'
import { section } from './section'
import { sectionContract } from './section-contract'
import { departmentContract } from './department-contract'
import { divisionContract } from './division-contract'
import { supervisorContract } from './supervisor-contract'
import { officerContract } from './officer-contract'
import { staff } from './staff'
import { stakeholderEntry } from './stakeholder-entry'
import { stakeholderEngagement } from './stakeholder-engagement'
import { sprintTask } from './sprint-task'
import { workSubmission } from './work-submission'
import { weeklySprint } from './weekly-sprint'
import { sectionDelegation } from './section-delegation'
import { staffTransferRequest } from './staff-transfer-request'
import { appNotification } from './app-notification'
import { auditLogEntry } from './audit-log-entry'
import { auditLogBatch } from './audit-log-batch'
import { boardAction } from './board-action'
export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    auditLogEntry,
    auditLogBatch,
    department,
    division,
    staff,
    section,
    sectionDelegation,
    staffTransferRequest,
    appNotification,
    sectionContract,
    departmentContract,
    divisionContract,
    supervisorContract,
    officerContract,
    detailedTask,
    measurableActivity,
    contractInitiative,
    ssmartaObjective,
    stakeholderEntry,
    stakeholderEngagement,
    sprintTask,
    workSubmission,
    weeklySprint,
    boardAction,
  ],
}
