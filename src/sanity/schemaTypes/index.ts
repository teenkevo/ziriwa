import { type SchemaTypeDefinition } from 'sanity'
import { measurableActivity } from './measurable-activity'
import { contractInitiative } from './contract-initiative'
import { ssmartaObjective } from './ssmarta-objective'
import { division } from './division'
import { member } from './member'
import { paymentTier } from './payment-tier'
import { payment } from './payment'
import { loan } from './loan'
import { resolution } from './resolution'
import { position } from './position'
import { nomination } from './nomination'
import { vote } from './vote'
import { meeting } from './meeting'
import { attendanceVerification } from './attendance-verification'
import { investment } from './investment'
import { financialInvestmentTransaction } from './financial-investment-transaction'
import { propertyInvestmentTransaction } from './property-investment-transaction'
import { property } from './property'
import { propertyTransaction } from './property-transaction'
import { investmentStatement } from './investment-statement'
import { section } from './section'
import { sectionContract } from './section-contract'
import { staff } from './staff'
export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    division,
    staff,
    section,
    sectionContract,
    measurableActivity,
    contractInitiative,
    ssmartaObjective,
    member,
    paymentTier,
    payment,
    loan,
    resolution,
    position,
    nomination,
    vote,
    meeting,
    attendanceVerification,
    investment,
    financialInvestmentTransaction,
    propertyInvestmentTransaction,
    property,
    propertyTransaction,
    investmentStatement,
  ],
}
