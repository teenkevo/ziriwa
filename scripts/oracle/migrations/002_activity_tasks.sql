
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_period_review_thread PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_period_deliverables PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_periods PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_review_thread PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_deliverables PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_task_inputs PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE activity_tasks PURGE';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

CREATE TABLE activity_tasks (
  id VARCHAR2(36) PRIMARY KEY,
  activity_id VARCHAR2(36) NOT NULL,
  task_key VARCHAR2(120) NOT NULL,
  task_text CLOB,
  task_order NUMBER NOT NULL,
  priority VARCHAR2(20),
  status VARCHAR2(30),
  assignee_staff_id VARCHAR2(36),
  target_date DATE,
  reporting_frequency VARCHAR2(30),
  reporting_period_start DATE,
  expected_deliverable CLOB
);

CREATE INDEX idx_activity_tasks_activity_order ON activity_tasks(activity_id, task_order);
CREATE INDEX idx_activity_tasks_assignee ON activity_tasks(assignee_staff_id);

CREATE TABLE activity_task_inputs (
  id VARCHAR2(36) PRIMARY KEY,
  task_id VARCHAR2(36) NOT NULL,
  asset_id VARCHAR2(36) NOT NULL,
  submitted_at TIMESTAMP
);
CREATE INDEX idx_activity_task_inputs_task ON activity_task_inputs(task_id);

CREATE TABLE activity_task_deliverables (
  id VARCHAR2(36) PRIMARY KEY,
  task_id VARCHAR2(36) NOT NULL,
  deliverable_key VARCHAR2(120) NOT NULL,
  asset_id VARCHAR2(36) NOT NULL,
  tag VARCHAR2(20),
  locked NUMBER(1) DEFAULT 0 NOT NULL
);
CREATE INDEX idx_activity_task_deliverables_task ON activity_task_deliverables(task_id);

CREATE TABLE activity_task_review_thread (
  id VARCHAR2(36) PRIMARY KEY,
  task_id VARCHAR2(36) NOT NULL,
  thread_key VARCHAR2(120) NOT NULL,
  thread_kind VARCHAR2(30) NOT NULL, -- inputs | deliverable
  author_staff_id VARCHAR2(36),
  role VARCHAR2(30),
  action VARCHAR2(30),
  message VARCHAR2(4000),
  created_at TIMESTAMP,
  asset_id VARCHAR2(36)
);
CREATE INDEX idx_activity_task_thread_task_kind ON activity_task_review_thread(task_id, thread_kind);

CREATE TABLE activity_task_periods (
  id VARCHAR2(36) PRIMARY KEY,
  task_id VARCHAR2(36) NOT NULL,
  period_key VARCHAR2(120) NOT NULL,
  status VARCHAR2(30),
  submitted_at TIMESTAMP
);
CREATE INDEX idx_activity_task_periods_task ON activity_task_periods(task_id);

CREATE TABLE activity_task_period_deliverables (
  id VARCHAR2(36) PRIMARY KEY,
  period_id VARCHAR2(36) NOT NULL,
  deliverable_key VARCHAR2(120) NOT NULL,
  asset_id VARCHAR2(36) NOT NULL,
  tag VARCHAR2(20),
  locked NUMBER(1) DEFAULT 0 NOT NULL
);
CREATE INDEX idx_activity_task_period_deliv_period ON activity_task_period_deliverables(period_id);

CREATE TABLE activity_task_period_review_thread (
  id VARCHAR2(36) PRIMARY KEY,
  period_id VARCHAR2(36) NOT NULL,
  thread_key VARCHAR2(120) NOT NULL,
  author_staff_id VARCHAR2(36),
  role VARCHAR2(30),
  action VARCHAR2(30),
  message VARCHAR2(4000),
  created_at TIMESTAMP,
  asset_id VARCHAR2(36)
);
CREATE INDEX idx_activity_task_period_thread_period ON activity_task_period_review_thread(period_id);

