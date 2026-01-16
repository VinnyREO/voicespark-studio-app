-- ============================================
-- COMPLETE FIX: All RLS Policies for Projects
-- This migration ensures projects load correctly
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP ALL EXISTING PROJECT POLICIES (to start clean)
-- ============================================
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON projects;

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own and shared projects" ON projects;

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- ============================================
-- 2. CREATE SIMPLE WORKING POLICIES FOR PROJECTS
-- ============================================

-- SELECT: Users can view their own projects (simple, reliable)
CREATE POLICY "projects_select_own"
ON projects FOR SELECT
USING (owner_id = auth.uid());

-- INSERT: Users can create their own projects
CREATE POLICY "projects_insert_own"
ON projects FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Users can update their own projects
CREATE POLICY "projects_update_own"
ON projects FOR UPDATE
USING (owner_id = auth.uid());

-- DELETE: Users can delete their own projects
CREATE POLICY "projects_delete_own"
ON projects FOR DELETE
USING (owner_id = auth.uid());

-- ============================================
-- 3. DROP ALL EXISTING PROJECT_DATA POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own project data" ON project_data;
DROP POLICY IF EXISTS "Users can view their project data" ON project_data;
DROP POLICY IF EXISTS "Users can view own and shared project data" ON project_data;

DROP POLICY IF EXISTS "Users can insert own project data" ON project_data;
DROP POLICY IF EXISTS "Users can insert their project data" ON project_data;
DROP POLICY IF EXISTS "Users can upsert own and shared project data" ON project_data;

DROP POLICY IF EXISTS "Users can update own project data" ON project_data;
DROP POLICY IF EXISTS "Users can update their project data" ON project_data;
DROP POLICY IF EXISTS "Users can update own and shared project data" ON project_data;

-- ============================================
-- 4. CREATE SIMPLE WORKING POLICIES FOR PROJECT_DATA
-- ============================================

-- SELECT: Users can view project data for their own projects
CREATE POLICY "project_data_select_own"
ON project_data FOR SELECT
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- INSERT: Users can insert project data for their own projects
CREATE POLICY "project_data_insert_own"
ON project_data FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- UPDATE: Users can update project data for their own projects
CREATE POLICY "project_data_update_own"
ON project_data FOR UPDATE
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- ============================================
-- 5. FIX TEAM_MEMBERS POLICIES (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Drop all existing team_members policies
    DROP POLICY IF EXISTS "Users can view team relationships" ON team_members;
    DROP POLICY IF EXISTS "Users can view their team relationships" ON team_members;
    DROP POLICY IF EXISTS "Users can invite teammates" ON team_members;
    DROP POLICY IF EXISTS "Team members can be updated" ON team_members;
    DROP POLICY IF EXISTS "Owners can update team relationships" ON team_members;
    DROP POLICY IF EXISTS "Members can respond to invitations" ON team_members;
    DROP POLICY IF EXISTS "Invited users can respond to invitations" ON team_members;
    DROP POLICY IF EXISTS "Owners can remove team members" ON team_members;

    -- SELECT: Users can see their own team relationships
    CREATE POLICY "team_members_select"
    ON team_members FOR SELECT
    USING (
      owner_id = auth.uid()
      OR member_user_id = auth.uid()
      OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

    -- INSERT: Users can invite teammates
    CREATE POLICY "team_members_insert"
    ON team_members FOR INSERT
    WITH CHECK (owner_id = auth.uid());

    -- UPDATE: Owners can update, invited users can accept/decline
    CREATE POLICY "team_members_update"
    ON team_members FOR UPDATE
    USING (
      owner_id = auth.uid()
      OR (
        invitation_status = 'pending'
        AND member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    );

    -- DELETE: Owners can remove team members
    CREATE POLICY "team_members_delete"
    ON team_members FOR DELETE
    USING (owner_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- Verify: List all policies on projects table
-- ============================================
-- Run this query separately to verify:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'projects';
