import { type SchemaTypeDefinition } from 'sanity'
import { detailedTask } from './detailed-task'
import { measurableActivity } from './measurable-activity'
import { contractInitiative } from './contract-initiative'
import { ssmartaObjective } from './ssmarta-objective'
import { department } from './department'
import { division } from './division'
import { section } from './section'
import { sectionContract } from './section-contract'
import { staff } from './staff'
import { stakeholderEntry } from './stakeholder-entry'
import { stakeholderEngagement } from './stakeholder-engagement'
import { sprintTask } from './sprint-task'
import { workSubmission } from './work-submission'
import { weeklySprint } from './weekly-sprint'
export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    department,
    division,
    staff,
    section,
    sectionContract,
    detailedTask,
    measurableActivity,
    contractInitiative,
    ssmartaObjective,
    stakeholderEntry,
    stakeholderEngagement,
    sprintTask,
    workSubmission,
    weeklySprint,
  ],
}
