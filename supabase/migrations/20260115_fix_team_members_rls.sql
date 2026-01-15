-- ============================================
-- COMPREHENSIVE FIX: All RLS Policies
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX PROJECTS TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Simple SELECT policy: Users can view their own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (owner_id = auth.uid());

-- INSERT policy: Users can create their own projects
CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- UPDATE policy: Users can update their own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (owner_id = auth.uid());

-- DELETE policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (owner_id = auth.uid());

-- ============================================
-- 2. FIX PROJECT_DATA TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view their project data" ON project_data;
DROP POLICY IF EXISTS "Users can view own and shared project data" ON project_data;
DROP POLICY IF EXISTS "Users can insert their project data" ON project_data;
DROP POLICY IF EXISTS "Users can upsert own and shared project data" ON project_data;
DROP POLICY IF EXISTS "Users can update their project data" ON project_data;
DROP POLICY IF EXISTS "Users can update own and shared project data" ON project_data;

-- SELECT policy for project_data
CREATE POLICY "Users can view own project data"
ON project_data FOR SELECT
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- INSERT policy for project_data
CREATE POLICY "Users can insert own project data"
ON project_data FOR INSERT
WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- UPDATE policy for project_data
CREATE POLICY "Users can update own project data"
ON project_data FOR UPDATE
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

-- ============================================
-- 3. FIX TEAM_MEMBERS TABLE RLS (if exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their team relationships" ON team_members;
    DROP POLICY IF EXISTS "Owners can update team relationships" ON team_members;
    DROP POLICY IF EXISTS "Members can respond to invitations" ON team_members;
    DROP POLICY IF EXISTS "Invited users can respond to invitations" ON team_members;
    DROP POLICY IF EXISTS "Users can invite teammates" ON team_members;
    DROP POLICY IF EXISTS "Owners can remove team members" ON team_members;

    -- SELECT: Users can see their own team relationships
    CREATE POLICY "Users can view team relationships"
    ON team_members FOR SELECT
    USING (
      owner_id = auth.uid()
      OR member_user_id = auth.uid()
      OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

    -- INSERT: Users can invite teammates
    CREATE POLICY "Users can invite teammates"
    ON team_members FOR INSERT
    WITH CHECK (owner_id = auth.uid());

    -- UPDATE: Owners can update, invited users can accept/decline
    CREATE POLICY "Team members can be updated"
    ON team_members FOR UPDATE
    USING (
      owner_id = auth.uid()
      OR (
        invitation_status = 'pending'
        AND member_user_id IS NULL
        AND member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    );

    -- DELETE: Owners can remove team members
    CREATE POLICY "Owners can remove team members"
    ON team_members FOR DELETE
    USING (owner_id = auth.uid());
  END IF;
END $$;
