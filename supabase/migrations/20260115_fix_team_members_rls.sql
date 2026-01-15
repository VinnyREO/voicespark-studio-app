-- ============================================
-- FIX: Team Members RLS Policies
-- Issue: Invited users cannot accept invitations
-- ============================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Owners can update team relationships" ON team_members;
DROP POLICY IF EXISTS "Members can respond to invitations" ON team_members;

-- Recreate owner update policy
CREATE POLICY "Owners can update team relationships"
ON team_members FOR UPDATE
USING (owner_id = auth.uid());

-- Fix: Allow invited users to accept/decline their invitations
-- Uses subquery to get current user's email for comparison
CREATE POLICY "Invited users can respond to invitations"
ON team_members FOR UPDATE
USING (
  -- Allow if the invitation is pending AND email matches current user
  invitation_status = 'pending'
  AND member_user_id IS NULL
  AND member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  -- When accepting: must set member_user_id to current user
  -- When declining: member_user_id stays null
  (member_user_id = auth.uid() AND invitation_status = 'accepted') OR
  (member_user_id IS NULL AND invitation_status = 'declined')
);

-- Also fix SELECT policy to properly match by email
DROP POLICY IF EXISTS "Users can view their team relationships" ON team_members;

CREATE POLICY "Users can view their team relationships"
ON team_members FOR SELECT
USING (
  owner_id = auth.uid()
  OR member_user_id = auth.uid()
  OR member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
