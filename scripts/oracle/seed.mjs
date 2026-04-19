import oracledb from 'oracledb'

import { loadOracleEnvFiles } from './lib/load-env.mjs'

loadOracleEnvFiles()

function requireEnv(name) {
  const v = process.env[name]
  if (!v || !String(v).trim()) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return String(v).trim()
}

function buildConnectString({ host, port, serviceName, sid }) {
  if (serviceName) {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${serviceName})))`
  }
  if (sid) {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`
  }
  throw new Error('Missing ORACLE_SERVICE_NAME or ORACLE_SID')
}

function formatYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getCurrentFinancialYearLabel(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1..12
  const startYear = month >= 7 ? year : year - 1
  const endYear = month >= 7 ? year + 1 : year
  return `FY-${startYear}/${endYear}`
}

function getLastMondayDate(date = new Date()) {
  // Monday is day 1. JS: Sunday=0, Monday=1, ...
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(monday.getDate() + diffToMonday)
  // Move to last week to ensure sprint week has started.
  monday.setDate(monday.getDate() - 7)
  return monday
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const env = {
  host: process.env.ORACLE_HOST?.trim() || 'localhost',
  port: Number(process.env.ORACLE_PORT?.trim() || '1521'),
  user: process.env.ORACLE_USER?.trim() || 'ziriwa',
  password: requireEnv('ORACLE_PASSWORD'),
  serviceName: process.env.ORACLE_SERVICE_NAME?.trim() || undefined,
  sid: process.env.ORACLE_SID?.trim() || undefined,
}

const connectString = buildConnectString(env)

const pool = await oracledb.createPool({
  user: env.user,
  password: env.password,
  connectString,
  poolMin: 0,
  poolMax: 1,
})

const conn = await pool.getConnection()
try {
  const now = new Date()
  const currentFY = getCurrentFinancialYearLabel(now)

  // Stable IDs for local testing.
  const deptId = 'dept-1'
  const divId = 'div-1'
  const sectionId = 'section-1'

  const managerId = 'staff-1'
  const supervisorId = 'staff-2'
  const officerId = 'staff-3'

  const contractId = 'contract-1'
  const engagementId = 'stake-1'

  const objectiveId = 'objective-1'
  const initiativeId = 'initiative-1'
  const measurableActivityRowId = 'measurable-activity-1'

  const sprintId = 'sprint-1'
  const acceptedTaskId = 'sprint-task-1'

  const activityKey = 'act-key-1'
  const initiativeKey = 'init-key-1'

  const weekStartMonday = getLastMondayDate(now)
  const weekEndFriday = new Date(weekStartMonday)
  weekEndFriday.setDate(weekStartMonday.getDate() + 4)

  // Make seeding re-runnable by clearing previously-seeded rows.
  // Delete children first, then parents.
  await conn.execute(
    `DELETE FROM work_submission_review_thread WHERE work_submission_id IN (
      SELECT id FROM work_submissions WHERE sprint_task_id IN (
        SELECT id FROM sprint_tasks WHERE sprint_id = :sprintId
      )
    )`,
    { sprintId },
  )
  await conn.execute(
    `DELETE FROM work_submissions WHERE sprint_task_id IN (
      SELECT id FROM sprint_tasks WHERE sprint_id = :sprintId
    )`,
    { sprintId },
  )
  await conn.execute(`DELETE FROM sprint_tasks WHERE sprint_id = :sprintId`, {
    sprintId,
  })
  await conn.execute(`DELETE FROM weekly_sprints WHERE id = :sprintId`, {
    sprintId,
  })

  await conn.execute(
    `DELETE FROM measurable_activity_evidence WHERE activity_id = :activityId`,
    { activityId: measurableActivityRowId },
  )
  await conn.execute(
    `DELETE FROM measurable_activities WHERE id = :activityId`,
    {
      activityId: measurableActivityRowId,
    },
  )
  await conn.execute(`DELETE FROM contract_initiatives WHERE id = :id`, {
    id: initiativeId,
  })
  await conn.execute(`DELETE FROM contract_objectives WHERE id = :id`, {
    id: objectiveId,
  })
  await conn.execute(`DELETE FROM section_contracts WHERE id = :id`, {
    id: contractId,
  })

  await conn.execute(
    `DELETE FROM stakeholder_entries WHERE engagement_id = :id`,
    {
      id: engagementId,
    },
  )
  await conn.execute(`DELETE FROM stakeholder_engagements WHERE id = :id`, {
    id: engagementId,
  })

  await conn.execute(`DELETE FROM sections WHERE id = :id`, { id: sectionId })
  await conn.execute(`DELETE FROM divisions WHERE id = :id`, { id: divId })
  await conn.execute(`DELETE FROM departments WHERE id = :id`, { id: deptId })

  await conn.execute(`DELETE FROM staff WHERE id IN (:m, :s, :o)`, {
    m: managerId,
    s: supervisorId,
    o: officerId,
  })

  // Department/division/section
  await conn.execute(
    `INSERT INTO departments (id, full_name, acronym, slug_current, is_default, commissioner_id)
     VALUES (:id, :full_name, :acronym, :slug_current, :is_default, :commissioner_id)`,
    {
      id: deptId,
      full_name: 'Data & Innovation Department',
      acronym: 'DID',
      slug_current: 'did',
      is_default: 1,
      commissioner_id: managerId,
    },
  )

  await conn.execute(
    `INSERT INTO divisions (id, full_name, acronym, slug_current, department_id, assistant_commissioner_id, is_default)
     VALUES (:id, :full_name, :acronym, :slug_current, :department_id, :assistant_commissioner_id, :is_default)`,
    {
      id: divId,
      full_name: 'Data Innovations and Projects Division',
      acronym: 'DIP',
      slug_current: 'dip',
      department_id: deptId,
      assistant_commissioner_id: managerId,
      is_default: 1,
    },
  )

  await conn.execute(
    `INSERT INTO sections (id, name, slug_current, division_id, manager_id, order_number)
     VALUES (:id, :name, :slug_current, :division_id, :manager_id, :order_number)`,
    {
      id: sectionId,
      name: 'Data Science Section',
      slug_current: 'data-science',
      division_id: divId,
      manager_id: managerId,
      order_number: 1,
    },
  )

  // Staff
  const staffRows = [
    {
      id: managerId,
      first_name: 'Ada',
      last_name: 'Manager',
      full_name: 'Ada Manager',
      id_number: 'M-001',
      email: 'manager@ura.go.ug',
      role: 'manager',
      phone: '000000000',
      status: 'active',
      department_id: deptId,
      division_id: divId,
      section_id: sectionId,
      reports_to_id: null,
    },
    {
      id: supervisorId,
      first_name: 'Sam',
      last_name: 'Supervisor',
      full_name: 'Sam Supervisor',
      id_number: 'S-001',
      email: 'supervisor@ura.go.ug',
      role: 'supervisor',
      phone: '000000001',
      status: 'active',
      department_id: deptId,
      division_id: divId,
      section_id: sectionId,
      reports_to_id: managerId,
    },
    {
      id: officerId,
      first_name: 'Ola',
      last_name: 'Officer',
      full_name: 'Ola Officer',
      id_number: 'O-001',
      email: 'officer@ura.go.ug',
      role: 'officer',
      phone: '000000002',
      status: 'active',
      department_id: deptId,
      division_id: divId,
      section_id: sectionId,
      reports_to_id: supervisorId,
    },
  ]

  for (const row of staffRows) {
    // eslint-disable-next-line no-await-in-loop
    await conn.execute(
      `INSERT INTO staff (id, first_name, last_name, full_name, id_number, email, role, phone, status, department_id, division_id, section_id, reports_to_id)
       VALUES (:id, :first_name, :last_name, :full_name, :id_number, :email, :role, :phone, :status, :department_id, :division_id, :section_id, :reports_to_id)`,
      row,
    )
  }

  // Section contract
  await conn.execute(
    `INSERT INTO section_contracts (id, section_id, financial_year_label, manager_id, status)
     VALUES (:id, :section_id, :financial_year_label, :manager_id, :status)`,
    {
      id: contractId,
      section_id: sectionId,
      financial_year_label: currentFY,
      manager_id: managerId,
      status: 'draft',
    },
  )

  const objectiveCode = '1.1'
  const initiativeCode = `${objectiveCode}.1`

  await conn.execute(
    `INSERT INTO contract_objectives (id, contract_id, objective_key, code, title, objective_order)
     VALUES (:id, :contract_id, :objective_key, :code, :title, :objective_order)`,
    {
      id: objectiveId,
      contract_id: contractId,
      objective_key: 'obj-key-1',
      code: objectiveCode,
      title: 'Objective 1',
      objective_order: 0,
    },
  )

  await conn.execute(
    `INSERT INTO contract_initiatives (id, objective_id, initiative_key, code, title, initiative_order)
     VALUES (:id, :objective_id, :initiative_key, :code, :title, :initiative_order)`,
    {
      id: initiativeId,
      objective_id: objectiveId,
      initiative_key: initiativeKey,
      code: initiativeCode,
      title: 'Initiative 1',
      initiative_order: 0,
    },
  )

  await conn.execute(
    `INSERT INTO measurable_activities (id, initiative_id, activity_key, activity_type, title, aim, activity_order, target_date, status, reporting_frequency, evidence_assets_json_placeholder)
     VALUES (:id, :initiative_id, :activity_key, :activity_type, :title, :aim, :activity_order, :target_date, :status, :reporting_frequency, 'x')`,
    {
      id: measurableActivityRowId,
      initiative_id: initiativeId,
      activity_key: activityKey,
      activity_type: 'kpi',
      title: 'Measurable Activity 1',
      aim: 'Improve KPI performance for local testing',
      activity_order: 0,
      target_date: null,
      status: 'not_started',
      reporting_frequency: 'monthly',
    },
  )

  // Stakeholder engagement doc
  await conn.execute(
    `INSERT INTO stakeholder_engagements (id, section_id, financial_year_label)
     VALUES (:id, :section_id, :financial_year_label)`,
    {
      id: engagementId,
      section_id: sectionId,
      financial_year_label: currentFY,
    },
  )

  // Weekly sprint with one accepted task
  await conn.execute(
    `INSERT INTO weekly_sprints (id, section_id, week_label, week_start, week_end, status, supervisor_staff_id)
     VALUES (:id, :section_id, :week_label, :week_start, :week_end, :status, :supervisor_staff_id)`,
    {
      id: sprintId,
      section_id: sectionId,
      week_label: `Week Seed (${formatYMD(weekStartMonday)}-${formatYMD(weekEndFriday)})`,
      week_start: weekStartMonday,
      week_end: weekEndFriday,
      status: 'submitted',
      supervisor_staff_id: supervisorId,
    },
  )

  await conn.execute(
    `INSERT INTO sprint_tasks (
      id, sprint_id, task_key, description, activity_category, initiative_key, initiative_title,
      activity_key, activity_title, status, revision_reason, reviewed_at,
      assignee_staff_id, assignee_name, priority, task_status
    ) VALUES (
      :id, :sprint_id, :task_key, :description, :activity_category, :initiative_key, :initiative_title,
      :activity_key, :activity_title, :status, :revision_reason, :reviewed_at,
      :assignee_staff_id, :assignee_name, :priority, :task_status
    )`,
    {
      id: acceptedTaskId,
      sprint_id: sprintId,
      task_key: 'task-1',
      description: 'Seed sprint task (accepted)',
      activity_category: 'normal_flow',
      initiative_key: initiativeKey,
      initiative_title: `Initiative 1`,
      activity_key: activityKey,
      activity_title: 'Measurable Activity 1',
      status: 'accepted',
      revision_reason: null,
      reviewed_at: now,
      assignee_staff_id: officerId,
      assignee_name: 'Ola Officer',
      priority: 'medium',
      task_status: 'to_do',
    },
  )

  await conn.commit()
  console.log('Oracle seed data inserted.')
} finally {
  await conn.close()
  await pool.close(0)
}
