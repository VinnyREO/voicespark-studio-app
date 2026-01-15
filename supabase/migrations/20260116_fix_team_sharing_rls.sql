-- ============================================
-- FIX: Team Sharing RLS Policies
-- This restores team sharing functionality
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX PROJECTS TABLE RLS - Include team sharing
-- ============================================
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON projects;

-- SELECT: Users can view own projects AND shared projects
CREATE POLICY "Users can view own and shared projects"
ON projects FOR SELECT
USING (
  -- Own projects
  owner_id = auth.uid()
  OR
  -- Project-specific access (accepted team members)
  id IN (
    SELECT project_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND access_scope = 'project'
    AND invitation_status = 'accepted'
    AND project_id IS NOT NULL
  )
  OR
  -- Workspace-wide access (teammate of the project owner)
  owner_id IN (
    SELECT owner_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND access_scope = 'workspace'
    AND invitation_status = 'accepted'
  )
);

-- INSERT: Users can create their own projects
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can update own projects AND shared projects (with editor role)
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own and shared projects" ON projects;
CREATE POLICY "Users can update own and shared projects"
ON projects FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  -- Project-specific editor access
  id IN (
    SELECT project_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND access_scope = 'project'
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  -- Workspace-wide editor access
  owner_id IN (
    SELECT owner_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND access_scope = 'workspace'
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
);

-- DELETE: Only owners can delete their projects
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (owner_id = auth.uid());

-- ============================================
-- 2. FIX PROJECT_DATA TABLE RLS - Include team sharing
-- ============================================
DROP POLICY IF EXISTS "Users can view own project data" ON project_data;
DROP POLICY IF EXISTS "Users can view own and shared project data" ON project_data;

-- SELECT: View project data for own AND shared projects
CREATE POLICY "Users can view own and shared project data"
ON project_data FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND access_scope = 'project'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE (tm.member_user_id = auth.uid() OR tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND tm.access_scope = 'workspace'
    AND tm.invitation_status = 'accepted'
  )
);

-- INSERT: Insert project data for own AND shared projects (editor role)
DROP POLICY IF EXISTS "Users can insert own project data" ON project_data;
DROP POLICY IF EXISTS "Users can upsert own and shared project data" ON project_data;
CREATE POLICY "Users can upsert own and shared project data"
ON project_data FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE (tm.member_user_id = auth.uid() OR tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND tm.access_scope = 'workspace'
    AND tm.role = 'editor'
    AND tm.invitation_status = 'accepted'
  )
);

-- UPDATE: Update project data for own AND shared projects (editor role)
DROP POLICY IF EXISTS "Users can update own project data" ON project_data;
DROP POLICY IF EXISTS "Users can update own and shared project data" ON project_data;
CREATE POLICY "Users can update own and shared project data"
ON project_data FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE (member_user_id = auth.uid() OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE (tm.member_user_id = auth.uid() OR tm.member_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND tm.access_scope = 'workspace'
    AND tm.role = 'editor'
    AND tm.invitation_status = 'accepted'
  )
);

-- ============================================
-- 3. ENSURE TEAM_MEMBERS RLS IS CORRECT
-- ============================================
DROP POLICY IF EXISTS "Users can view team relationships" ON team_members;
DROP POLICY IF EXISTS "Users can view their team relationships" ON team_members;

-- SELECT: Users can see relationships where they are owner, member, or invited by email
CREATE POLICY "Users can view team relationships"
ON team_members FOR SELECT
USING (
  owner_id = auth.uid()
  OR member_user_id = auth.uid()
  OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Ensure other team_members policies exist
DROP POLICY IF EXISTS "Users can invite teammates" ON team_members;
CREATE POLICY "Users can invite teammates"
ON team_members FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Team members can be updated" ON team_members;
CREATE POLICY "Team members can be updated"
ON team_members FOR UPDATE
USING (
  owner_id = auth.uid()
  OR (
    invitation_status = 'pending'
    AND member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners can remove team members" ON team_members;
CREATE POLICY "Owners can remove team members"
ON team_members FOR DELETE
USING (owner_id = auth.uid());
