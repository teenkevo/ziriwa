import fs from 'fs'
import path from 'path'
import { faker } from '@faker-js/faker'

import { labels, statuses } from './data'

const tasks = Array.from({ length: 23 }, () => ({
  id: `MEM-${faker.number.int({ min: 1000, max: 9999 })}`,
  name: faker.person.fullName(),
  title: faker.hacker.adjective().replace(/^./, letter => letter.toUpperCase()),
  investment: faker.finance.amount({
    min: 200000,
    max: 4000000,
    dec: 0,
    // symbol: 'UGX',
  }),
  benovelent: faker.finance.amount({
    min: 20000,
    max: 30000,
    dec: 0,
    // symbol: 'UGX',
  }),
  loan: faker.finance.amount({
    min: 500000,
    max: 3000000,
    dec: 0,
    // symbol: 'UGX',
  }),
  arrearStatus: faker.helpers.arrayElement(statuses).value,
  label: faker.helpers.arrayElement(labels).value,
}))

fs.writeFileSync(
  path.join(__dirname, 'tasks.json'),
  JSON.stringify(tasks, null, 2),
)

console.log('✅ Tasks data generated.')
