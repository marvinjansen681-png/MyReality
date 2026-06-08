-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- WORKSPACES
CREATE POLICY "Members can view workspace" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can update workspace" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view other members" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can insert members" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- PROJECTS
CREATE POLICY "Workspace members can view projects" ON projects FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace members can update projects" ON projects FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- COLUMNS
CREATE POLICY "Workspace members can manage columns" ON columns FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- TASKS
CREATE POLICY "Workspace members can view tasks" ON tasks FOR SELECT
  USING (
    (is_personal = true AND created_by = auth.uid())
    OR
    (is_personal = false AND project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    ))
  );
CREATE POLICY "Members can create tasks" ON tasks FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update tasks" ON tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Creator can delete tasks" ON tasks FOR DELETE USING (created_by = auth.uid());

-- TASK COMMENTS
CREATE POLICY "Workspace members can view comments" ON task_comments FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
CREATE POLICY "Members can add comments" ON task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors can delete comments" ON task_comments FOR DELETE USING (user_id = auth.uid());

-- TASK ACTIVITY
CREATE POLICY "Members can view activity" ON task_activity FOR SELECT
  USING (task_id IN (SELECT id FROM tasks));
CREATE POLICY "System can insert activity" ON task_activity FOR INSERT WITH CHECK (user_id = auth.uid());

-- WEEKLY PLANS
CREATE POLICY "Users manage own weekly plans" ON weekly_plans FOR ALL USING (user_id = auth.uid());

-- VISIONS
CREATE POLICY "Users manage own visions" ON visions FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
