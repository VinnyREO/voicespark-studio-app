-- ============================================
-- TEAM MEMBERS TABLE
-- Handles both project-specific and workspace-wide access
-- ============================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who owns this team relationship (the inviter's user_id)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The teammate being granted access
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT, -- Used for pending invitations

  -- Access scope: 'workspace' = all projects, 'project' = specific project only
  access_scope TEXT NOT NULL DEFAULT 'project' CHECK (access_scope IN ('workspace', 'project')),

  -- If access_scope = 'project', which project? (NULL for workspace-wide)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Permission level
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),

  -- Invitation tracking
  invitation_token UUID DEFAULT gen_random_uuid(),
  invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_member CHECK (member_user_id IS NOT NULL OR member_email IS NOT NULL),
  CONSTRAINT workspace_no_project CHECK (
    (access_scope = 'workspace' AND project_id IS NULL) OR
    (access_scope = 'project' AND project_id IS NOT NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(member_email);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_token ON team_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_members_scope ON team_members(owner_id, access_scope);

-- Unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique_workspace
ON team_members(owner_id, member_email, access_scope)
WHERE access_scope = 'workspace';

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique_project
ON team_members(owner_id, member_email, project_id)
WHERE access_scope = 'project' AND project_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Users can see team relationships where they are the owner, member, or invited
-- Note: For pending invitations, email matching is handled in application code
-- We allow seeing any invitation (member_email is not sensitive) so app can filter by email
CREATE POLICY "Users can view their team relationships"
ON team_members FOR SELECT
USING (
  owner_id = auth.uid() OR
  member_user_id = auth.uid() OR
  invitation_status = 'pending'  -- Allow seeing pending invitations (app filters by email)
);

-- Users can create team invitations (they become the owner)
CREATE POLICY "Users can invite teammates"
ON team_members FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Owners can update their team relationships
CREATE POLICY "Owners can update team relationships"
ON team_members FOR UPDATE
USING (owner_id = auth.uid());

-- Members can accept/decline their invitations
-- Security: App verifies email match before calling. RLS ensures member_user_id is set to current user.
CREATE POLICY "Members can respond to invitations"
ON team_members FOR UPDATE
USING (
  -- Allow updating pending invitations (email verification done in app)
  invitation_status = 'pending' AND member_user_id IS NULL
)
WITH CHECK (
  -- When accepting: must set member_user_id to current user
  -- When declining: member_user_id stays null
  (member_user_id = auth.uid() AND invitation_status = 'accepted') OR
  (member_user_id IS NULL AND invitation_status = 'declined')
);

-- Owners can remove team members
CREATE POLICY "Owners can remove team members"
ON team_members FOR DELETE
USING (owner_id = auth.uid());

-- ============================================
-- UPDATE PROJECTS TABLE RLS
-- Allow teammates to access shared projects
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON projects;

-- Create new comprehensive SELECT policy
CREATE POLICY "Users can view own and shared projects"
ON projects FOR SELECT
USING (
  -- Own projects
  owner_id = auth.uid()
  OR
  -- Project-specific access
  id IN (
    SELECT project_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND access_scope = 'project'
    AND invitation_status = 'accepted'
  )
  OR
  -- Workspace-wide access (teammate of the project owner)
  owner_id IN (
    SELECT owner_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND access_scope = 'workspace'
    AND invitation_status = 'accepted'
  )
);

-- Update policy for editors
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their projects and shared projects" ON projects;
DROP POLICY IF EXISTS "Users can update own and shared projects" ON projects;

CREATE POLICY "Users can update own and shared projects"
ON projects FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  -- Project-specific editor access
  id IN (
    SELECT project_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND access_scope = 'project'
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  -- Workspace-wide editor access
  owner_id IN (
    SELECT owner_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND access_scope = 'workspace'
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
);

-- ============================================
-- UPDATE PROJECT_DATA TABLE RLS
-- Allow teammates to access shared project data
-- ============================================

DROP POLICY IF EXISTS "Users can view their project data" ON project_data;
DROP POLICY IF EXISTS "Users can insert their project data" ON project_data;
DROP POLICY IF EXISTS "Users can update their project data" ON project_data;
DROP POLICY IF EXISTS "Users can view own and shared project data" ON project_data;
DROP POLICY IF EXISTS "Users can upsert own and shared project data" ON project_data;
DROP POLICY IF EXISTS "Users can update own and shared project data" ON project_data;

CREATE POLICY "Users can view own and shared project data"
ON project_data FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND access_scope = 'project'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE tm.member_user_id = auth.uid()
    AND tm.access_scope = 'workspace'
    AND tm.invitation_status = 'accepted'
  )
);

CREATE POLICY "Users can upsert own and shared project data"
ON project_data FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE tm.member_user_id = auth.uid()
    AND tm.access_scope = 'workspace'
    AND tm.role = 'editor'
    AND tm.invitation_status = 'accepted'
  )
);

CREATE POLICY "Users can update own and shared project data"
ON project_data FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT project_id FROM team_members
    WHERE member_user_id = auth.uid()
    AND role = 'editor'
    AND invitation_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.owner_id = p.owner_id
    WHERE tm.member_user_id = auth.uid()
    AND tm.access_scope = 'workspace'
    AND tm.role = 'editor'
    AND tm.invitation_status = 'accepted'
  )
);

-- ============================================
-- HELPER FUNCTION: Get user's accessible projects
-- ============================================

CREATE OR REPLACE FUNCTION get_accessible_project_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  -- Own projects
  SELECT id FROM projects WHERE owner_id = user_uuid
  UNION
  -- Project-specific access
  SELECT project_id FROM team_members
  WHERE member_user_id = user_uuid
  AND access_scope = 'project'
  AND invitation_status = 'accepted'
  AND project_id IS NOT NULL
  UNION
  -- Workspace-wide access
  SELECT p.id FROM projects p
  JOIN team_members tm ON tm.owner_id = p.owner_id
  WHERE tm.member_user_id = user_uuid
  AND tm.access_scope = 'workspace'
  AND tm.invitation_status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
