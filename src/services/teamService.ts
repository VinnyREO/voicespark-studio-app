import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type AccessScope = 'workspace' | 'project';
export type TeamRole = 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface TeamMember {
  id: string;
  owner_id: string;
  member_user_id: string | null;
  member_email: string | null;
  access_scope: AccessScope;
  project_id: string | null;
  role: TeamRole;
  invitation_status: InvitationStatus;
  invitation_token: string;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface InviteParams {
  email: string;
  accessScope: AccessScope;
  role: TeamRole;
  projectIds?: string[]; // Required if accessScope is 'project'
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all teammates (both workspace-wide and project-specific)
 */
export async function getTeammates(): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[teamService] Failed to get teammates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get teammates for a specific project
 */
export async function getProjectTeammates(projectId: string): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('owner_id', user.id)
    .or(`project_id.eq.${projectId},access_scope.eq.workspace`)
    .eq('invitation_status', 'accepted');

  if (error) {
    console.error('[teamService] Failed to get project teammates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get workspace-wide teammates only
 */
export async function getWorkspaceTeammates(): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('owner_id', user.id)
    .eq('access_scope', 'workspace')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[teamService] Failed to get workspace teammates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get pending invitations sent by current user
 */
export async function getPendingInvitations(): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq('owner_id', user.id)
    .eq('invitation_status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get invitations received by current user
 */
export async function getReceivedInvitations(): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Not authenticated');

  // Query by email (the primary way invitations are sent)
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq('member_email', user.email.toLowerCase())
    .eq('invitation_status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) {
    console.error('[teamService] Error getting received invitations:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Invite a teammate
 * - If accessScope is 'workspace', they get access to ALL projects
 * - If accessScope is 'project', they only get access to specified projects
 */
export async function inviteTeammate(params: InviteParams): Promise<TeamMember[]> {
  const { email, accessScope, role, projectIds } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Validate params
  if (accessScope === 'project' && (!projectIds || projectIds.length === 0)) {
    throw new Error('Must specify at least one project for project-based access');
  }

  // Check if user is inviting themselves
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    throw new Error('You cannot invite yourself');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // For workspace-wide access, create a single record
  if (accessScope === 'workspace') {
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        owner_id: user.id,
        member_user_id: null,
        member_email: normalizedEmail,
        access_scope: 'workspace',
        project_id: null,
        role,
        invitation_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate invitation (unique constraint violation)
      if (error.code === '23505') {
        throw new Error('This person has already been invited');
      }
      console.error('[teamService] Failed to invite teammate:', error);
      throw error;
    }

    console.log('[teamService] Invitation sent to:', normalizedEmail);
    return [data];
  }

  // For project-based access, create records for each project
  const records = projectIds!.map(projectId => ({
    owner_id: user.id,
    member_user_id: null,
    member_email: normalizedEmail,
    access_scope: 'project' as const,
    project_id: projectId,
    role,
    invitation_status: 'pending' as const,
  }));

  const { data, error } = await supabase
    .from('team_members')
    .insert(records)
    .select();

  if (error) {
    // Handle duplicate invitation (unique constraint violation)
    if (error.code === '23505') {
      throw new Error('This person has already been invited to one or more of these projects');
    }
    console.error('[teamService] Failed to invite to projects:', error);
    throw error;
  }

  console.log('[teamService] Invitations sent to:', normalizedEmail, 'for', projectIds!.length, 'projects');
  return data || [];
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Not authenticated');

  // Update only if the invitation matches the current user's email
  const { error } = await supabase
    .from('team_members')
    .update({
      member_user_id: user.id,
      invitation_status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('member_email', user.email.toLowerCase());

  if (error) {
    console.error('[teamService] Failed to accept invitation:', error);
    throw error;
  }

  console.log('[teamService] Invitation accepted');
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Not authenticated');

  // Update only if the invitation matches the current user's email
  const { error } = await supabase
    .from('team_members')
    .update({
      invitation_status: 'declined',
    })
    .eq('id', invitationId)
    .eq('member_email', user.email.toLowerCase());

  if (error) {
    console.error('[teamService] Failed to decline invitation:', error);
    throw error;
  }

  console.log('[teamService] Invitation declined');
}

/**
 * Remove a teammate (owner action)
 */
export async function removeTeammate(teammateId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', teammateId);

  if (error) {
    console.error('[teamService] Failed to remove teammate:', error);
    throw error;
  }
}

/**
 * Update teammate's role
 */
export async function updateTeammateRole(
  teammateId: string,
  role: TeamRole
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teammateId);

  if (error) {
    console.error('[teamService] Failed to update teammate role:', error);
    throw error;
  }
}

/**
 * Check if current user has access to a project
 */
export async function checkProjectAccess(projectId: string): Promise<{
  hasAccess: boolean;
  role: TeamRole | 'owner' | null;
  accessType: 'owner' | 'workspace' | 'project' | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasAccess: false, role: null, accessType: null };

  // Check if owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (project?.owner_id === user.id) {
    return { hasAccess: true, role: 'owner', accessType: 'owner' };
  }

  // Check workspace-wide access first
  const { data: workspaceAccess } = await supabase
    .from('team_members')
    .select('role')
    .eq('member_user_id', user.id)
    .eq('invitation_status', 'accepted')
    .eq('access_scope', 'workspace')
    .eq('owner_id', project?.owner_id)
    .single();

  if (workspaceAccess) {
    return {
      hasAccess: true,
      role: workspaceAccess.role as TeamRole,
      accessType: 'workspace',
    };
  }

  // Check project-specific access
  const { data: projectAccess } = await supabase
    .from('team_members')
    .select('role')
    .eq('member_user_id', user.id)
    .eq('invitation_status', 'accepted')
    .eq('access_scope', 'project')
    .eq('project_id', projectId)
    .single();

  if (projectAccess) {
    return {
      hasAccess: true,
      role: projectAccess.role as TeamRole,
      accessType: 'project',
    };
  }

  return { hasAccess: false, role: null, accessType: null };
}

/**
 * Get projects shared with the current user
 */
export async function getSharedProjects(): Promise<Array<{
  id: string;
  name: string;
  owner_id: string;
  updated_at: string;
  access_type: 'workspace' | 'project';
  role: TeamRole;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get all accepted team memberships
  const { data: memberships, error: membershipError } = await supabase
    .from('team_members')
    .select('owner_id, project_id, access_scope, role')
    .eq('member_user_id', user.id)
    .eq('invitation_status', 'accepted');

  if (membershipError) throw membershipError;
  if (!memberships || memberships.length === 0) return [];

  // Separate workspace and project memberships
  const workspaceOwnerIds = memberships
    .filter(m => m.access_scope === 'workspace')
    .map(m => m.owner_id);

  const projectIds = memberships
    .filter(m => m.access_scope === 'project' && m.project_id)
    .map(m => m.project_id!);

  const results: Array<{
    id: string;
    name: string;
    owner_id: string;
    updated_at: string;
    access_type: 'workspace' | 'project';
    role: TeamRole;
  }> = [];

  // Get projects from workspace access
  if (workspaceOwnerIds.length > 0) {
    const { data: workspaceProjects } = await supabase
      .from('projects')
      .select('id, name, owner_id, updated_at')
      .in('owner_id', workspaceOwnerIds);

    if (workspaceProjects) {
      for (const project of workspaceProjects) {
        const membership = memberships.find(
          m => m.access_scope === 'workspace' && m.owner_id === project.owner_id
        );
        results.push({
          ...project,
          access_type: 'workspace',
          role: membership?.role as TeamRole,
        });
      }
    }
  }

  // Get projects from project-specific access
  if (projectIds.length > 0) {
    const { data: specificProjects } = await supabase
      .from('projects')
      .select('id, name, owner_id, updated_at')
      .in('id', projectIds);

    if (specificProjects) {
      for (const project of specificProjects) {
        // Skip if already added via workspace access
        if (results.some(r => r.id === project.id)) continue;

        const membership = memberships.find(
          m => m.access_scope === 'project' && m.project_id === project.id
        );
        results.push({
          ...project,
          access_type: 'project',
          role: membership?.role as TeamRole,
        });
      }
    }
  }

  return results.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
