-- Minimal relational schema to support Oracle-backed CMS replacement.
-- This is intentionally scoped to:
-- - sections/divisions/departments
-- - staff hierarchy
-- - section contracts (objectives -> initiatives -> measurable activities)
-- - stakeholder engagements
-- - weekly sprints (sprint tasks + work submissions + review thread)
-- - assets (BLOB evidence / uploads)
--
-- Note: Deep activity task structures will be added in later migrations
-- when `replace-cms-api` is implemented.

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE work_submission_review_thread PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE work_submissions PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE sprint_tasks PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE weekly_sprints PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE measurable_activity_evidence PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE measurable_activities PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE contract_initiatives PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE contract_objectives PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE section_contracts PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE stakeholder_entries PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE stakeholder_engagements PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE assets PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE sections PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE divisions PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE departments PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE staff PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

-- Assets
CREATE TABLE assets (
  id                VARCHAR2(36) PRIMARY KEY,
  original_filename VARCHAR2(255),
  mime_type         VARCHAR2(100),
  size_bytes        NUMBER,
  blob_data         BLOB,
  created_at        TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_assets_mime_type ON assets(mime_type);

-- Staff & org hierarchy
CREATE TABLE staff (
  id            VARCHAR2(36) PRIMARY KEY,
  first_name   VARCHAR2(50),
  last_name    VARCHAR2(50),
  full_name    VARCHAR2(200),
  id_number    VARCHAR2(50),
  email         VARCHAR2(200),
  role          VARCHAR2(60) NOT NULL,
  phone         VARCHAR2(50),
  status        VARCHAR2(20) DEFAULT 'active' NOT NULL,

  department_id VARCHAR2(36),
  division_id   VARCHAR2(36),
  section_id    VARCHAR2(36),
  reports_to_id VARCHAR2(36)
);

CREATE INDEX idx_staff_email_lower ON staff(email);
CREATE INDEX idx_staff_role_status ON staff(role, status);
CREATE INDEX idx_staff_section_role ON staff(section_id, role, status);
CREATE INDEX idx_staff_division_role ON staff(division_id, role, status);

-- Departments
CREATE TABLE departments (
  id          VARCHAR2(36) PRIMARY KEY,
  full_name  VARCHAR2(200) NOT NULL,
  acronym     VARCHAR2(50),
  slug_current VARCHAR2(96) NOT NULL UNIQUE,
  is_default  NUMBER(1) DEFAULT 0 NOT NULL,
  commissioner_id VARCHAR2(36)
);

-- Divisions
CREATE TABLE divisions (
  id          VARCHAR2(36) PRIMARY KEY,
  full_name  VARCHAR2(200) NOT NULL,
  acronym     VARCHAR2(50),
  slug_current VARCHAR2(96) NOT NULL UNIQUE,
  department_id VARCHAR2(36),
  assistant_commissioner_id VARCHAR2(36),
  is_default  NUMBER(1) DEFAULT 0 NOT NULL
);

-- Sections
CREATE TABLE sections (
  id          VARCHAR2(36) PRIMARY KEY,
  name        VARCHAR2(100) NOT NULL,
  slug_current VARCHAR2(96) NOT NULL UNIQUE,
  division_id VARCHAR2(36) NOT NULL,
  manager_id  VARCHAR2(36) NOT NULL,
  order_number NUMBER
);

-- Stakeholder engagement
CREATE TABLE stakeholder_engagements (
  id VARCHAR2(36) PRIMARY KEY,
  section_id VARCHAR2(36) NOT NULL,
  financial_year_label VARCHAR2(30) NOT NULL
);

CREATE UNIQUE INDEX ux_stakeholder_engagements ON stakeholder_engagements(section_id, financial_year_label);

CREATE TABLE stakeholder_entries (
  id VARCHAR2(36) PRIMARY KEY,
  engagement_id VARCHAR2(36) NOT NULL,
  stakeholder_key VARCHAR2(36) NOT NULL,
  sn NUMBER,
  stakeholder VARCHAR2(100),
  designation VARCHAR2(150),
  name VARCHAR2(200) NOT NULL,
  phone_number VARCHAR2(80),
  email_address VARCHAR2(200),
  address VARCHAR2(500),
  objective_of_engagement VARCHAR2(500),
  initiative_code VARCHAR2(50),
  power VARCHAR2(2),
  interest VARCHAR2(2),
  priority VARCHAR2(2),
  stakeholder_expectations VARCHAR2(2000),
  ura_expectations VARCHAR2(2000),
  proposed_date_of_engagement VARCHAR2(30),
  mode_of_engagement VARCHAR2(50),
  engagement_report VARCHAR2(4000),
  budget_highlights VARCHAR2(4000),
  total_cost NUMBER,
  ura_delegation_staff_id VARCHAR2(36)
);

CREATE INDEX idx_stakeholder_entries_engagement ON stakeholder_entries(engagement_id);

-- Section contract (tree)
CREATE TABLE section_contracts (
  id VARCHAR2(36) PRIMARY KEY,
  section_id VARCHAR2(36) NOT NULL,
  financial_year_label VARCHAR2(30) NOT NULL,
  manager_id VARCHAR2(36) NOT NULL,
  status VARCHAR2(20) DEFAULT 'draft' NOT NULL
);

CREATE UNIQUE INDEX ux_section_contracts ON section_contracts(section_id, financial_year_label);

CREATE TABLE contract_objectives (
  id VARCHAR2(36) PRIMARY KEY,
  contract_id VARCHAR2(36) NOT NULL,
  objective_key VARCHAR2(36) NOT NULL,
  code VARCHAR2(50) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  objective_order NUMBER NOT NULL
);

CREATE INDEX idx_contract_objectives_contract_order ON contract_objectives(contract_id, objective_order);

CREATE TABLE contract_initiatives (
  id VARCHAR2(36) PRIMARY KEY,
  objective_id VARCHAR2(36) NOT NULL,
  initiative_key VARCHAR2(36) NOT NULL,
  code VARCHAR2(100),
  title VARCHAR2(200) NOT NULL,
  initiative_order NUMBER NOT NULL
);

CREATE INDEX idx_contract_initiatives_objective_order ON contract_initiatives(objective_id, initiative_order);

CREATE TABLE measurable_activities (
  id VARCHAR2(36) PRIMARY KEY,
  initiative_id VARCHAR2(36) NOT NULL,
  activity_key VARCHAR2(36) NOT NULL,
  activity_type VARCHAR2(30) NOT NULL,
  title VARCHAR2(200) NOT NULL,
  aim CLOB,
  activity_order NUMBER,
  target_date DATE,
  status VARCHAR2(30),
  reporting_frequency VARCHAR2(30),
  evidence_assets_json_placeholder VARCHAR2(1)
);

CREATE INDEX idx_measurable_activities_initiative_key ON measurable_activities(initiative_id, activity_key);

CREATE TABLE measurable_activity_evidence (
  id VARCHAR2(36) PRIMARY KEY,
  activity_id VARCHAR2(36) NOT NULL,
  asset_id VARCHAR2(36) NOT NULL
);

CREATE INDEX idx_mea_evidence_activity ON measurable_activity_evidence(activity_id);

-- Weekly sprints
CREATE TABLE weekly_sprints (
  id VARCHAR2(36) PRIMARY KEY,
  section_id VARCHAR2(36) NOT NULL,
  week_label VARCHAR2(200) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status VARCHAR2(20) NOT NULL,
  supervisor_staff_id VARCHAR2(36) NOT NULL
);

CREATE INDEX idx_weekly_sprints_section_week_start ON weekly_sprints(section_id, week_start);

CREATE TABLE sprint_tasks (
  id VARCHAR2(36) PRIMARY KEY,
  sprint_id VARCHAR2(36) NOT NULL,
  task_key VARCHAR2(36) NOT NULL,
  description VARCHAR2(4000) NOT NULL,
  activity_category VARCHAR2(50) NOT NULL,
  initiative_key VARCHAR2(36) NOT NULL,
  initiative_title VARCHAR2(200),
  activity_key VARCHAR2(36) NOT NULL,
  activity_title VARCHAR2(200),
  status VARCHAR2(30) NOT NULL,
  revision_reason VARCHAR2(4000),
  reviewed_at TIMESTAMP,
  assignee_staff_id VARCHAR2(36),
  assignee_name VARCHAR2(200),
  priority VARCHAR2(20),
  task_status VARCHAR2(30)
);

CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task_key ON sprint_tasks(task_key);

CREATE TABLE work_submissions (
  id VARCHAR2(36) PRIMARY KEY,
  sprint_task_id VARCHAR2(36) NOT NULL,
  submission_key VARCHAR2(36) NOT NULL,
  submission_date DATE NOT NULL,
  start_time VARCHAR2(10) NOT NULL,
  end_time VARCHAR2(10) NOT NULL,
  total_hours NUMBER(10,2),
  description VARCHAR2(4000) NOT NULL,
  status VARCHAR2(20) NOT NULL,
  submitted_at TIMESTAMP,
  revenue_assessed NUMBER,
  output_asset_id VARCHAR2(36)
);

CREATE INDEX idx_work_submissions_task ON work_submissions(sprint_task_id);
CREATE INDEX idx_work_submissions_submission_key ON work_submissions(submission_key);

CREATE TABLE work_submission_review_thread (
  id VARCHAR2(36) PRIMARY KEY,
  work_submission_id VARCHAR2(36) NOT NULL,
  thread_key VARCHAR2(36) NOT NULL,
  role VARCHAR2(20) NOT NULL,
  action VARCHAR2(20) NOT NULL,
  message VARCHAR2(4000),
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ws_review_submission ON work_submission_review_thread(work_submission_id, created_at);

