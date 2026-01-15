import { supabase } from '@/lib/supabase';

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
}

export interface ProjectWithData extends Project {
  data?: any;
}

// Create new project
export async function createProject(name: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, owner_id: user.id })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// List user's projects
export async function listProjects(): Promise<Project[]> {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[projectService] listProjects - user:', user?.id, user?.email);

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  console.log('[projectService] listProjects - result:', {
    count: data?.length,
    error: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details
  });

  if (error) throw error;
  return data || [];
}

// Get project with data
export async function getProject(projectId: string): Promise<ProjectWithData> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  const { data: projectData, error: dataError } = await supabase
    .from('project_data')
    .select('data')
    .eq('project_id', projectId)
    .single();

  if (dataError && dataError.code !== 'PGRST116') throw dataError;

  return {
    ...project,
    data: projectData?.data,
  };
}

// Save project data - optimized with upsert and non-blocking timestamp update
export async function saveProjectData(projectId: string, data: any): Promise<void> {
  const startTime = performance.now();
  console.log('[projectService] saveProjectData called');
  console.log('[projectService] projectId:', projectId);
  console.log('[projectService] data structure:', {
    version: data.version,
    editorState: {
      clips: data.editorState?.clips?.length,
    },
    mediaMetadata: data.mediaMetadata?.length,
  });

  const now = new Date().toISOString();

  // Use upsert with onConflict - single query instead of check-then-update
  const { error } = await supabase
    .from('project_data')
    .upsert(
      {
        project_id: projectId,
        data: data,
        updated_at: now,
      },
      {
        onConflict: 'project_id',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.error('[projectService] Save error:', error);
    throw error;
  }

  const elapsed = performance.now() - startTime;
  console.log(`[projectService] ✅ Saved in ${elapsed.toFixed(0)}ms`);

  // Update project timestamp in background (don't await - non-blocking)
  supabase
    .from('projects')
    .update({ updated_at: now })
    .eq('id', projectId)
    .then(() => console.log('[projectService] Project timestamp updated'))
    .catch(err => console.warn('[projectService] Failed to update timestamp:', err));
}

// Delete project
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

// Rename project
export async function renameProject(projectId: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ name: newName })
    .eq('id', projectId);

  if (error) throw error;
}
