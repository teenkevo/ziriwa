-- Adds FK constraints for the schema created by 001_init.sql.
-- Idempotent: re-running ignores "constraint already exists".

DECLARE
  PROCEDURE add_fk(p_sql VARCHAR2) IS
  BEGIN
    EXECUTE IMMEDIATE p_sql;
  EXCEPTION
    WHEN OTHERS THEN
      -- ORA-02275: such a referential constraint already exists in the table
      IF SQLCODE = -2275 THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;
BEGIN
  -- Staff/org
  add_fk('ALTER TABLE staff ADD CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(id)');
  add_fk('ALTER TABLE staff ADD CONSTRAINT fk_staff_division FOREIGN KEY (division_id) REFERENCES divisions(id)');
  add_fk('ALTER TABLE staff ADD CONSTRAINT fk_staff_section FOREIGN KEY (section_id) REFERENCES sections(id)');
  add_fk('ALTER TABLE staff ADD CONSTRAINT fk_staff_reports_to FOREIGN KEY (reports_to_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE departments ADD CONSTRAINT fk_departments_commissioner FOREIGN KEY (commissioner_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE divisions ADD CONSTRAINT fk_divisions_department FOREIGN KEY (department_id) REFERENCES departments(id)');
  add_fk('ALTER TABLE divisions ADD CONSTRAINT fk_divisions_asst_commissioner FOREIGN KEY (assistant_commissioner_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE sections ADD CONSTRAINT fk_sections_division FOREIGN KEY (division_id) REFERENCES divisions(id)');
  add_fk('ALTER TABLE sections ADD CONSTRAINT fk_sections_manager FOREIGN KEY (manager_id) REFERENCES staff(id)');

  -- Stakeholders
  add_fk('ALTER TABLE stakeholder_engagements ADD CONSTRAINT fk_stk_engagements_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE stakeholder_entries ADD CONSTRAINT fk_stk_entries_engagement FOREIGN KEY (engagement_id) REFERENCES stakeholder_engagements(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE stakeholder_entries ADD CONSTRAINT fk_stk_entries_ura_staff FOREIGN KEY (ura_delegation_staff_id) REFERENCES staff(id)');

  -- Contracts tree
  add_fk('ALTER TABLE section_contracts ADD CONSTRAINT fk_section_contracts_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE section_contracts ADD CONSTRAINT fk_section_contracts_manager FOREIGN KEY (manager_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE contract_objectives ADD CONSTRAINT fk_contract_objectives_contract FOREIGN KEY (contract_id) REFERENCES section_contracts(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE contract_initiatives ADD CONSTRAINT fk_contract_initiatives_objective FOREIGN KEY (objective_id) REFERENCES contract_objectives(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE measurable_activities ADD CONSTRAINT fk_measurable_activities_initiative FOREIGN KEY (initiative_id) REFERENCES contract_initiatives(id) ON DELETE CASCADE');

  add_fk('ALTER TABLE measurable_activity_evidence ADD CONSTRAINT fk_mea_evidence_activity FOREIGN KEY (activity_id) REFERENCES measurable_activities(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE measurable_activity_evidence ADD CONSTRAINT fk_mea_evidence_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE');

  -- Weekly sprints
  add_fk('ALTER TABLE weekly_sprints ADD CONSTRAINT fk_weekly_sprints_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE weekly_sprints ADD CONSTRAINT fk_weekly_sprints_supervisor FOREIGN KEY (supervisor_staff_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE sprint_tasks ADD CONSTRAINT fk_sprint_tasks_sprint FOREIGN KEY (sprint_id) REFERENCES weekly_sprints(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE sprint_tasks ADD CONSTRAINT fk_sprint_tasks_assignee_staff FOREIGN KEY (assignee_staff_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE work_submissions ADD CONSTRAINT fk_work_submissions_task FOREIGN KEY (sprint_task_id) REFERENCES sprint_tasks(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE work_submissions ADD CONSTRAINT fk_work_submissions_output_asset FOREIGN KEY (output_asset_id) REFERENCES assets(id) ON DELETE SET NULL');
  add_fk('ALTER TABLE work_submission_review_thread ADD CONSTRAINT fk_ws_review_submission FOREIGN KEY (work_submission_id) REFERENCES work_submissions(id) ON DELETE CASCADE');

  -- Activity tasks
  add_fk('ALTER TABLE activity_tasks ADD CONSTRAINT fk_activity_tasks_activity FOREIGN KEY (activity_id) REFERENCES measurable_activities(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_tasks ADD CONSTRAINT fk_activity_tasks_assignee FOREIGN KEY (assignee_staff_id) REFERENCES staff(id)');

  add_fk('ALTER TABLE activity_task_inputs ADD CONSTRAINT fk_activity_task_inputs_task FOREIGN KEY (task_id) REFERENCES activity_tasks(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_task_inputs ADD CONSTRAINT fk_activity_task_inputs_asset FOREIGN KEY (asset_id) REFERENCES assets(id)');

  add_fk('ALTER TABLE activity_task_deliverables ADD CONSTRAINT fk_activity_task_deliverables_task FOREIGN KEY (task_id) REFERENCES activity_tasks(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_task_deliverables ADD CONSTRAINT fk_activity_task_deliverables_asset FOREIGN KEY (asset_id) REFERENCES assets(id)');

  add_fk('ALTER TABLE activity_task_review_thread ADD CONSTRAINT fk_activity_task_thread_task FOREIGN KEY (task_id) REFERENCES activity_tasks(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_task_review_thread ADD CONSTRAINT fk_activity_task_thread_author FOREIGN KEY (author_staff_id) REFERENCES staff(id)');
  add_fk('ALTER TABLE activity_task_review_thread ADD CONSTRAINT fk_activity_task_thread_asset FOREIGN KEY (asset_id) REFERENCES assets(id)');

  add_fk('ALTER TABLE activity_task_periods ADD CONSTRAINT fk_activity_task_periods_task FOREIGN KEY (task_id) REFERENCES activity_tasks(id) ON DELETE CASCADE');

  add_fk('ALTER TABLE activity_task_period_deliverables ADD CONSTRAINT fk_activity_task_period_deliv_period FOREIGN KEY (period_id) REFERENCES activity_task_periods(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_task_period_deliverables ADD CONSTRAINT fk_activity_task_period_deliv_asset FOREIGN KEY (asset_id) REFERENCES assets(id)');

  add_fk('ALTER TABLE activity_task_period_review_thread ADD CONSTRAINT fk_activity_task_period_thread_period FOREIGN KEY (period_id) REFERENCES activity_task_periods(id) ON DELETE CASCADE');
  add_fk('ALTER TABLE activity_task_period_review_thread ADD CONSTRAINT fk_activity_task_period_thread_author FOREIGN KEY (author_staff_id) REFERENCES staff(id)');
  add_fk('ALTER TABLE activity_task_period_review_thread ADD CONSTRAINT fk_activity_task_period_thread_asset FOREIGN KEY (asset_id) REFERENCES assets(id)');
END;
/

